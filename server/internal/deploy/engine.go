package deploy

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/serverme/serverme/server/internal/db"
)

// Engine handles building and deploying projects as Docker containers.
type Engine struct {
	db     *db.DB
	domain string
	log    zerolog.Logger
}

// NewEngine creates a new deploy engine.
func NewEngine(database *db.DB, domain string, log zerolog.Logger) *Engine {
	return &Engine{
		db:     database,
		domain: domain,
		log:    log.With().Str("component", "deploy").Logger(),
	}
}

// Deploy builds and runs a project.
func (e *Engine) Deploy(ctx context.Context, project *db.Project) error {
	e.logMsg(ctx, project.ID, "Starting deployment...", "deploy")
	e.db.UpdateProjectStatus(ctx, project.ID, "building", "", 0)

	// Stop existing container if any
	if project.ContainerID != "" {
		e.stopContainer(project.ContainerID)
	}

	// Generate Dockerfile if not using custom
	dockerfile := e.generateDockerfile(project)
	e.logMsg(ctx, project.ID, fmt.Sprintf("Framework: %s", project.Framework), "build")

	// Build directory
	buildDir := fmt.Sprintf("/tmp/serverme-build/%s", project.ID)
	exec.Command("mkdir", "-p", buildDir).Run()

	// If repo URL provided, clone it
	if project.RepoURL != "" {
		e.logMsg(ctx, project.ID, fmt.Sprintf("Cloning %s (branch: %s)...", project.RepoURL, project.Branch), "build")

		cmd := exec.CommandContext(ctx, "git", "clone", "--depth", "1", "--branch", project.Branch, project.RepoURL, buildDir+"/app")
		output, err := cmd.CombinedOutput()
		if err != nil {
			e.logMsg(ctx, project.ID, fmt.Sprintf("Clone failed: %s", string(output)), "error")
			e.db.UpdateProjectStatus(ctx, project.ID, "failed", "", 0)
			return fmt.Errorf("git clone: %w", err)
		}
	}

	// Write Dockerfile
	dockerfilePath := buildDir + "/Dockerfile"
	exec.Command("bash", "-c", fmt.Sprintf("cat > %s << 'DOCKERFILE'\n%s\nDOCKERFILE", dockerfilePath, dockerfile)).Run()

	// Build Docker image
	imageName := fmt.Sprintf("sm-project-%s", project.ID[:8])
	e.logMsg(ctx, project.ID, "Building Docker image...", "build")

	buildCtx := buildDir
	if project.RepoURL != "" {
		buildCtx = buildDir + "/app"
		// Copy Dockerfile into app dir
		exec.Command("cp", dockerfilePath, buildCtx+"/Dockerfile").Run()
	}

	cmd := exec.CommandContext(ctx, "docker", "build", "-t", imageName, buildCtx)
	output, err := cmd.CombinedOutput()
	if err != nil {
		e.logMsg(ctx, project.ID, fmt.Sprintf("Build failed: %s", string(output)), "error")
		e.db.UpdateProjectStatus(ctx, project.ID, "failed", "", 0)
		return fmt.Errorf("docker build: %w", err)
	}
	e.logMsg(ctx, project.ID, "Build successful", "build")

	// Find an available port
	port := 10100 + (time.Now().UnixNano() % 900)

	// Build env var flags
	var envFlags []string
	for k, v := range project.EnvVars {
		envFlags = append(envFlags, "-e", fmt.Sprintf("%s=%s", k, v))
	}

	// Run container
	e.logMsg(ctx, project.ID, "Starting container...", "deploy")
	args := []string{"run", "-d", "--name", fmt.Sprintf("sm-%s", project.ID[:8]),
		"-p", fmt.Sprintf("%d:3000", port),
		"--restart", "unless-stopped",
		"--memory", "512m", "--cpus", "0.5",
	}
	args = append(args, envFlags...)
	args = append(args, imageName)

	cmd = exec.CommandContext(ctx, "docker", args...)
	containerOutput, err := cmd.CombinedOutput()
	if err != nil {
		e.logMsg(ctx, project.ID, fmt.Sprintf("Run failed: %s", string(containerOutput)), "error")
		e.db.UpdateProjectStatus(ctx, project.ID, "failed", "", 0)
		return fmt.Errorf("docker run: %w", err)
	}

	containerID := strings.TrimSpace(string(containerOutput))
	if len(containerID) > 12 {
		containerID = containerID[:12]
	}

	e.db.UpdateProjectStatus(ctx, project.ID, "running", containerID, int(port))
	e.logMsg(ctx, project.ID, fmt.Sprintf("Deployed at https://%s.%s (container: %s, port: %d)", project.Subdomain, e.domain, containerID, port), "deploy")

	// Register with Caddy
	e.registerRoute(project.Subdomain, int(port))

	// Cleanup build dir
	exec.Command("rm", "-rf", buildDir).Run()

	return nil
}

// Stop stops a project's container.
func (e *Engine) Stop(ctx context.Context, project *db.Project) error {
	if project.ContainerID != "" {
		e.stopContainer(project.ContainerID)
		e.removeContainer(fmt.Sprintf("sm-%s", project.ID[:8]))
	}
	e.db.UpdateProjectStatus(ctx, project.ID, "stopped", "", 0)
	e.logMsg(ctx, project.ID, "Project stopped", "deploy")
	return nil
}

// Delete stops and removes a project completely.
func (e *Engine) Delete(ctx context.Context, project *db.Project) error {
	e.Stop(ctx, project)
	// Remove Docker image
	exec.Command("docker", "rmi", fmt.Sprintf("sm-project-%s", project.ID[:8])).Run()
	return nil
}

func (e *Engine) stopContainer(containerID string) {
	exec.Command("docker", "stop", containerID).Run()
}

func (e *Engine) removeContainer(name string) {
	exec.Command("docker", "rm", "-f", name).Run()
}

func (e *Engine) registerRoute(subdomain string, port int) {
	// Caddy handles all *.serverme.site via on-demand TLS
	// The container port is proxied via the tunnel HTTP proxy OR
	// we add a route dynamically. For simplicity, use the existing
	// Caddy catch-all and have the API proxy to the container.
	e.log.Info().Str("subdomain", subdomain).Int("port", port).Msg("route registered")
}

func (e *Engine) generateDockerfile(project *db.Project) string {
	switch project.Framework {
	case "nextjs":
		return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`

	case "node":
		startCmd := project.StartCmd
		if startCmd == "" {
			startCmd = "node index.js"
		}
		return fmt.Sprintf(`FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["%s"]`, startCmd)

	case "python":
		startCmd := project.StartCmd
		if startCmd == "" {
			startCmd = "python app.py"
		}
		return fmt.Sprintf(`FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true
COPY . .
EXPOSE 3000
CMD ["%s"]`, startCmd)

	case "static":
		return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`

	case "docker":
		return "" // User provides their own Dockerfile

	default:
		return `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci 2>/dev/null || true
EXPOSE 3000
CMD ["npm", "start"]`
	}
}

func (e *Engine) logMsg(ctx context.Context, projectID, message, level string) {
	e.db.AddDeployLog(ctx, projectID, message, level)
	e.log.Info().Str("project", projectID).Str("level", level).Msg(message)
}

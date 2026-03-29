class Serverme < Formula
  desc "Open-source tunnel to expose your local servers to the internet"
  homepage "https://serverme.site"
  version "1.0.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/jams24/serverme/releases/download/v#{version}/serverme_darwin_arm64.tar.gz"
      sha256 "39e1435ea7d036c9dd3a09676d16d250f5d43ded8888c977452992dc93991fd2"
    else
      url "https://github.com/jams24/serverme/releases/download/v#{version}/serverme_darwin_amd64.tar.gz"
      sha256 "579d90fe713c78e8e31d6425cbd0d857312a72572769b953a0c5e7c25a7a73e1"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/jams24/serverme/releases/download/v#{version}/serverme_linux_arm64.tar.gz"
      sha256 "84bff299f4721ba830af9b48871198b9d883bb7475eaa6655d32a996b8df7849"
    else
      url "https://github.com/jams24/serverme/releases/download/v#{version}/serverme_linux_amd64.tar.gz"
      sha256 "3f982ae67e000f966d327d284ea3429a6840bc96d2440df8590611c29da52fdf"
    end
  end

  def install
    bin.install "serverme"
  end

  test do
    assert_match "serverme version", shell_output("#{bin}/serverme version")
  end
end

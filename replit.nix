{ pkgs }: {
  deps = [
    pkgs.nodejs_22
    pkgs.nodePackages.pnpm
    pkgs.git
    pkgs.python3
    pkgs.gnumake
    pkgs.gcc
  ];
}

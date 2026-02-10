{ pkgs, ... }: {
  channel = "stable-23.11"; # or "unstable"
  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
    pkgs.postgresql
    pkgs.openssl
  ];
  env = {};
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "Prisma.prisma"
      "bradlc.vscode-tailwindcss"
    ];
    workspace = {
      onCreate = {
        install = "pnpm install";
        default.openFiles = [ "README.md" ];
      };
      onStart = {
        run-db = "docker-compose up -d";
      };
    };
  };
}

const PROJECT_DATABASE = "creative_costwise";

const PROTECTED_DATABASES = new Set(["depth_dot", "sample_mflix", "admin", "local", "config"]);

export function databaseNameFromUrl(connectionString: string) {
  const parsed = new URL(connectionString);
  return decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] ?? "");
}

export function assertProjectDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URL is missing. Point it at the creative_costwise database.");
  }
  let name = "";
  try {
    name = databaseNameFromUrl(connectionString);
  } catch {
    throw new Error("DATABASE_URL is not a valid MongoDB connection string.");
  }
  if (!name || name !== PROJECT_DATABASE || PROTECTED_DATABASES.has(name)) {
    throw new Error(
      `Refusing to connect to database "${name || "(none)"}". Creative Costwise only uses ${PROJECT_DATABASE} and will not modify other databases on this cluster.`,
    );
  }
  return name;
}

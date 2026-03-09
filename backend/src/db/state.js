let databaseConnected = false;

export function setDatabaseConnected(value) {
  databaseConnected = Boolean(value);
}

export function isDatabaseConnected() {
  return databaseConnected;
}

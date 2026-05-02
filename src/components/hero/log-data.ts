export interface LogEntry {
  level: "OK" | "INFO" | "WARN" | "ERR";
  message: string;
}

export const initialLogs: Array<LogEntry & { delay: number }> = [
  { level: "OK",   message: "classified in 5.3ms",   delay: 0 },
  { level: "OK",   message: "classified in 11.2ms",  delay: 300 },
  { level: "INFO", message: "obj classified: 3/4",   delay: 600 },
  { level: "ERR",  message: "timeout",               delay: 900 },
  { level: "INFO", message: "retrying... (1/2)",     delay: 1200 },
  { level: "WARN", message: "distribution shift",    delay: 1500 },
  { level: "INFO", message: "retrying... (2/2)",     delay: 1800 },
  { level: "ERR",  message: "index out of bounds",   delay: 2100 },
  { level: "ERR",  message: "classification failed", delay: 2400 },
];

export const continuousPool: LogEntry[] = [
  { level: "OK",   message: "classified in 7.8ms" },
  { level: "INFO", message: "batch complete: 12/12" },
  { level: "WARN", message: "memory usage: 84%" },
  { level: "OK",   message: "classified in 4.1ms" },
  { level: "INFO", message: "uptime: 2h 14m" },
  { level: "ERR",  message: "connection reset" },
  { level: "WARN", message: "retry limit approaching" },
  { level: "OK",   message: "classified in 9.2ms" },
  { level: "INFO", message: "queue depth: 0" },
  { level: "OK",   message: "classified in 6.5ms" },
  { level: "INFO", message: "model loaded: v2.3.1" },
  { level: "WARN", message: "throughput below threshold" },
];

import { UAParser } from "ua-parser-js";

export function getDeviceInfo(): string {
  // Ringkas identitas perangkat agar riwayat login mudah dipahami admin dan user.
  const parser = new UAParser();
  const result = parser.getResult();

  const device = result.device.vendor
    ? `${result.device.vendor} ${result.device.model}`
    : "Desktop";

  return `${device} | ${result.os.name} | ${result.browser.name}`;
}

export function getDeviceId(): string {
  // Simpan ID perangkat di browser agar satu device tetap dikenali pada login berikutnya.
  let id = localStorage.getItem("deviceId");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }

  return id;
}

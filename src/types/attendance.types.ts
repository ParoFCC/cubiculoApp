export interface AttendanceRecord {
  id: string;
  admin_id: string;
  cubiculo_id: string;
  type: "entry" | "exit";
  method: "button" | "qr" | "nfc";
  recorded_at: string;
  admin_name: string;
}

export interface AttendanceStatus {
  status: "in" | "out";
  last_record: AttendanceRecord | null;
}

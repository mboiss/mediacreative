const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to convert DD-MMM-YY (e.g. 28-Aug-23) to YYYY-MM-DD
function parseDate(str) {
  if (!str) return "2024-01-01";
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };
  const parts = str.trim().split("-");
  if (parts.length < 3) return "2024-01-01";
  const day = parts[0].padStart(2, "0");
  const month = months[parts[1]] || "01";
  let yearStr = parts[2];
  let year = Number(yearStr);
  if (year < 100) {
    year += 2000;
  }
  return `${year}-${month}-${day}`;
}

// Client normalization map (grouping variations to clean client names)
function normalizeClientName(raw) {
  if (!raw) return "General Client";
  const s = raw.trim();
  if (s.includes("Waka Hotels")) return "Waka Hotels Management";
  if (s.includes("Nusabay")) return "Nusabay Menjangan";
  if (s.includes("Happy Trails")) return "Happy Trails! Asia";
  if (s.includes("Waka Gae")) return "Waka Gae Selaras";
  if (s.includes("Rumah Hari Ceria")) return "Rumah Hari Ceria";
  if (s.includes("Island Houses")) return "The Island Houses";
  if (s.includes("Shaadi")) return "Shaadi Bali";
  if (s.includes("Art Design")) return "Art Design Solutions";
  if (s.includes("Cili Travel")) return "Cili Travel";
  if (s.includes("Mimpi Indah")) return "PT Mimpi Indah Luar Kotak";
  if (s.includes("Stjernegaard")) return "Stjernegaard";
  if (s.includes("WakaLouka") || s.includes("Waka Louka")) return "Waka Louka Industries";
  if (s.includes("Waka Sailing")) return "Waka Sailing";
  if (s.includes("Waka Landcruises") || s.includes("Waka Land")) return "Waka Landcruises";
  if (s.includes("Waka Beach")) return "Waka Beach Club";
  return s;
}

const rawData = [
  // Page 1
  { date: '28-Aug-23', client: 'Waka Hotels Management', product: 'Switch Hub DLINK 8 Port', amount: 745000 },
  { date: '28-Aug-23', client: 'Nusabay Menjangan', product: 'CPU Komplit 2 unit', amount: 13990000 },
  { date: '30-Aug-23', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Aug.2023', amount: 600000 },
  { date: '30-Aug-23', client: 'Waka Hotels Management', product: 'Maintenance Web Waka Aug.23', amount: 600000 },
  { date: '01-Sep-23', client: 'Happy Trails! Asia', product: 'Media Creative NET 16 unit', amount: 9600000 },
  { date: '07-Sep-23', client: 'Nusabay Menjangan', product: 'CPU only', amount: 3800000 },
  { date: '08-Sep-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 6600000 },
  { date: '16-Sep-23', client: 'Stjernegaard', product: 'Modem Wifi', amount: 430000 },
  { date: '16-Sep-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3600000 },
  { date: '16-Sep-23', client: 'Waka Hotels Management', product: 'Upgrade PC Bu Maria', amount: 660000 },
  { date: '01-Oct-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '02-Oct-23', client: 'Waka Louka Industries', product: 'perpanjangan o365 2unit', amount: 0 },
  { date: '05-Oct-23', client: 'Waka Hotels Management', product: 'Maintenance web sept. 23', amount: 600000 },
  { date: '05-Oct-23', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Sept 2023', amount: 900000 },
  { date: '13-Oct-23', client: 'Waka Gae Selaras', product: 'Upgrade pc Pak Alit', amount: 460000 },
  { date: '15-Oct-23', client: 'Rumah Hari Ceria', product: 'Service Komputer', amount: 200000 },
  { date: '15-Oct-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4800000 },
  { date: '20-Sep-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '22-Oct-23', client: 'Rumah Hari Ceria', product: 'Upgrade Komputer', amount: 650000 },
  { date: '23-Oct-23', client: 'Waka Hotels Management', product: 'Charger laptop', amount: 220000 },
  { date: '02-Nov-23', client: 'Waka Hotels Management', product: 'Web maintenance Okt', amount: 600000 },
  { date: '02-Nov-23', client: 'Waka Hotels Management', product: 'IT Support oktober', amount: 400000 },
  { date: '03-Oct-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '10-Nov-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '04-Dec-23', client: 'Waka Hotels Management', product: 'Maintenance web sept. 23', amount: 600000 },
  { date: '04-Dec-23', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Sept 2023', amount: 600000 },
  { date: '10-Dec-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '12-Dec-23', client: 'Waka Hotels Management', product: 'Komputer & Printer', amount: 8795000 },
  { date: '16-Dec-23', client: 'Waka Hotels Management', product: 'Hardisk Eksternal 500GB', amount: 525000 },
  { date: '16-Dec-23', client: 'Waka Hotels Management', product: 'Upgrade PC Krisna & Dede', amount: 720000 },
  { date: '16-Dec-23', client: 'Waka Hotels Management', product: 'Upgrade PC Dede', amount: 220000 },
  { date: '23-Dec-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3600000 },
  { date: '23-Dec-23', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 7200000 },
  { date: '02-Jan-24', client: 'The Island Houses', product: 'Perpanjangan o365 4unit', amount: 0 },
  { date: '05-Jan-24', client: 'Waka Hotels Management', product: 'Brosur Waka Sailing', amount: 2000000 },
  { date: '05-Dec-24', client: 'Waka Hotels Management', product: 'Maintenance web Dec. 23', amount: 600000 },
  { date: '05-Dec-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Dec.23', amount: 450000 },
  { date: '05-Jan-24', client: 'Waka Hotels Management', product: 'Kartu Nama 1 BOX', amount: 90000 },
  { date: '19-Jan-24', client: 'Nusabay Menjangan', product: 'Brosur WakaLandCruise 1000', amount: 2000000 },
  { date: '19-Jan-24', client: 'Waka Beach Club', product: 'Brosuer Waka Beach Club 1000 Pcs', amount: 0 },
  { date: '23-Jan-24', client: 'The Island Houses', product: 'Kaspersky 5 unit', amount: 725000 },
  { date: '06-Feb-24', client: 'Waka Hotels Management', product: 'Maintenance web Jan 2024', amount: 600000 },
  { date: '06-Feb-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Jan 2024', amount: 500000 },
  { date: '10-Feb-24', client: 'Waka Hotels Management', product: 'Charger laptop lenovo', amount: 320000 },
  { date: '10-Feb-24', client: 'The Island Houses', product: 'Maintenance and service', amount: 200000 },
  { date: '12-Feb-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '16-Feb-24', client: 'Waka Hotels Management', product: 'kartu nama 2 box', amount: 180000 },
  { date: '16-Feb-24', client: 'Nusabay Menjangan', product: 'Antivirus 3 user', amount: 435000 },
  { date: '16-Feb-24', client: 'Waka Sailing', product: 'Antivirus 2 user', amount: 290000 },
  { date: '16-Feb-24', client: 'Waka Hotels Management', product: 'Antivirus 7 user', amount: 1015000 },
  { date: '18-Feb-24', client: 'The Island Houses', product: 'SSD and service', amount: 470000 },
  { date: '24-Feb-24', client: 'Waka Hotels Management', product: 'hardisk 1tb and service', amount: 570000 },
  { date: '04-Mar-24', client: 'Waka Hotels Management', product: 'Upgrade PC Bu Era', amount: 655000 },
  { date: '04-Mar-24', client: 'Waka Hotels Management', product: 'PSU', amount: 465000 },
  { date: '05-Mar-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '05-Mar-24', client: 'Waka Hotels Management', product: 'Maintenance web Feb 2024', amount: 600000 },
  { date: '05-Mar-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Feb 2024', amount: 820000 },
  { date: '12-Mar-24', client: 'Laura', product: 'Setting and Install new laptop', amount: 2000 },
  { date: '17-Mar-24', client: 'Waka Hotels Management', product: 'Updgrade Laptop Bu Era and Dede', amount: 1250000 },
  { date: '19-Mar-24', client: 'Waka Hotels Management', product: 'hdd 2tb dan mouse', amount: 1655000 },
  { date: '20-Mar-24', client: 'Waka Gae Selaras', product: 'Service Komputer', amount: 200000 },
  { date: '26-Mar-24', client: 'Waka Hotels Management', product: 'UPS', amount: 4980000 },
  { date: '28-Mar-24', client: 'Waka Hotels Management', product: 'HDD WD NAS 2TB', amount: 4800000 },
  { date: '28-Mar-24', client: 'Casananta', product: 'Setup Email Yandex and setting DNS', amount: 200000 },
  { date: '02-Apr-24', client: 'Waka Hotels Management', product: 'Maintenance web March 2024', amount: 600000 },
  { date: '02-Apr-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management March 2024', amount: 950000 },

  // Page 2
  { date: '12-Apr-24', client: 'Stjernegaard', product: 'Modem Wifi', amount: 600000 },
  { date: '12-Apr-24', client: 'Oji Bali', product: 'Upgrade Ms Office', amount: 100000 },
  { date: '17-Apr-24', client: 'Waka Sailing', product: 'Brosur 1000pcs', amount: 0 },
  { date: '17-Apr-24', client: 'Waka Landcruises', product: 'Brosur 1000pcs', amount: 0 },
  { date: '19-Apr-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3600000 },
  { date: '30-Apr-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '30-Apr-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '30-Apr-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 7800000 },
  { date: '06-May-24', client: 'Waka Hotels Management', product: 'Maintenance web Apr. 2024', amount: 600000 },
  { date: '06-May-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Apr. 2024', amount: 1000000 },
  { date: '06-May-24', client: 'Waka Hotels Management', product: 'Modem Orbit N1', amount: 650000 },
  { date: '06-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '06-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '09-May-24', client: 'Nusabay Menjangan', product: 'Kerta Printer Kasir dan Tinta', amount: 370000 },
  { date: '09-May-24', client: 'Waka Hotels Management', product: 'Tinta 2 botol', amount: 240000 },
  { date: '13-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4800000 },
  { date: '13-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '14-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '22-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '22-May-24', client: 'Nusabay Menjangan', product: 'Kertas 20 roll', amount: 250000 },
  { date: '24-May-24', client: 'Waka Hotels Management', product: 'ASUS Vivobook 14 A1404VA VIPS321', amount: 7905000 },
  { date: '27-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '27-May-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 5400000 },
  { date: '28-May-24', client: 'Stjernegaard', product: 'Monitor dan lampu bar', amount: 700000 },
  { date: '05-Jun-24', client: 'Waka Hotels Management', product: 'Maintenance web Mei. 2024', amount: 600000 },
  { date: '05-Jun-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Mei 2024', amount: 850000 },
  { date: '05-Jun-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '08-Jun-24', client: 'Waka Hotels Management', product: 'Kartu nama 4box', amount: 360000 },
  { date: '11-Jun-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '12-Jun-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4800000 },
  { date: '22-Jun-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 7200000 },
  { date: '24-Jun-24', client: 'Laura', product: 'Setup and install Laptop', amount: 250000 },
  { date: '29-Jun-24', client: 'Waka Hotels Management', product: 'Brosur WakaSailing', amount: 2000000 },
  { date: '03-Jul-24', client: 'Laura', product: 'Setup and install Laptop', amount: 250000 },
  { date: '04-Jul-24', client: 'Stjernegaard', product: 'Keyboard UShaadi Bali Logitech 2 unit', amount: 284000 },
  { date: '05-Jul-24', client: 'Waka Hotels Management', product: 'Maintenance web June 2024', amount: 600000 },
  { date: '05-Jul-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management June 2024', amount: 400000 },
  { date: '07-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '08-Jul-24', client: 'Waka Gae Selaras', product: 'Hosting & Domain', amount: 840000 },
  { date: '10-Jul-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '12-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 0 },
  { date: '12-Jul-24', client: 'Waka Hotels Management', product: 'CPU dan Monitor', amount: 0 },
  { date: '13-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 9000000 },
  { date: '16-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '18-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 10200000 },
  { date: '21-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '27-Jul-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 6600000 },
  { date: '02-Aug-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '05-Aug-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 10200000 },
  { date: '06-Aug-24', client: 'Waka Hotels Management', product: 'Maintenance web July 2024', amount: 600000 },
  { date: '06-Aug-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management July 2024', amount: 450000 },
  { date: '07-Aug-24', client: 'DNB Cargo', product: 'Hosting & Domain', amount: 950000 },
  { date: '07-Aug-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 10800000 },
  { date: '09-Aug-24', client: 'Happy Trails! Asia', product: 'Tambahan Modem wifi', amount: 1200000 },
  { date: '09-Aug-24', client: 'Laura', product: 'Laptop Asus', amount: 6250000 },
  { date: '20-Aug-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '03-Sep-24', client: 'Happy Trails! Asia', product: 'Tambahan Modem wifi', amount: 9000000 },
  { date: '06-Sep-24', client: 'Laura', product: 'Pembelian Laptop lenovo', amount: 12949000 },
  { date: '06-Sep-24', client: 'Waka Hotels Management', product: 'Maintenance web Agustus 2024', amount: 600000 },
  { date: '06-Sep-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Agustus 2024', amount: 1095000 },
  { date: '06-Sep-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4200000 },
  { date: '06-Sep-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3600000 },
  { date: '10-Sep-24', client: 'Waka Hotels Management', product: 'Pembelian Laptop Asus Bu Tia', amount: 9799000 },
  { date: '17-Sep-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 5400000 },
  { date: '28-Sep-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 0 },
  { date: '01-Oct-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '03-Oct-24', client: 'Art Design Solutions', product: 'Setup Microsoft Exchage', amount: 250000 },
  { date: '04-Oct-24', client: 'Waka Hotels Management', product: 'Maintenance web September 2024', amount: 600000 },
  { date: '04-Oct-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management September 2024', amount: 550000 },

  // Page 3
  { date: '09-Oct-24', client: 'WakaLouka', product: 'Lisensi Office 365 Business Basic, 1 thn', amount: 1650000 },
  { date: '13-Oct-24', client: 'Nusabay Menjangan', product: 'CPU', amount: 2800000 },
  { date: '13-Oct-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 6000000 },
  { date: '20-Oct-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '21-Oct-24', client: 'Waka Landcruises', product: 'Brosur', amount: 2000000 },
  { date: '23-Oct-24', client: 'WI', product: 'Paket Komputer', amount: 4750000 },
  { date: '29-Oct-24', client: 'Waka Hotels Management', product: 'Printer Mini BLUEPRINT Thermal Bluetooth BP-ECO58D + Kertas 15 Rol', amount: 485000 },
  { date: '29-Oct-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '30-Oct-24', client: 'Nusabay Menjangan', product: 'UPS dan Mouse', amount: 805000 },
  { date: '01-Nov-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '04-Nov-24', client: 'Waka Hotels Management', product: 'Maintenance Website 2024', amount: 600000 },
  { date: '04-Nov-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management Oktober 2024', amount: 0 },
  { date: '04-Nov-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '07-Nov-24', client: 'Nusabay Menjangan', product: 'Batre laptop Asus X441u', amount: 360000 },
  { date: '12-Nov-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '18-Nov-24', client: 'Art Design Solutions', product: 'Wifi Extension', amount: 385000 },
  { date: '26-Nov-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '04-Dec-24', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '12-Dec-24', client: 'Waka Hotels Management', product: 'Maintenance Website November 2024', amount: 600000 },
  { date: '12-Dec-24', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management November 2024', amount: 650000 },
  { date: '16-Dec-24', client: 'Mimpi Indah Luar Kotak', product: 'HP Printer Smart and setup', amount: 2000000 },
  { date: '16-Dec-24', client: 'Mimpi Indah Luar Kotak', product: 'Antivirus Kaspersky Internet Security 1thn', amount: 145000 },
  { date: '19-Dec-24', client: 'Villa Zee', product: 'Setup Range Extender', amount: 100000 },
  { date: '19-Dec-24', client: 'Villa Azura', product: 'TP Link range extender and setup', amount: 485000 },
  { date: '21-Dec-24', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3600000 },
  { date: '23-Dec-24', client: 'Nusabay Menjangan', product: 'CPU dan Monitor', amount: 4900000 },
  { date: '06-Jan-25', client: 'The Island Houses', product: 'Switch hub TPLINK dan service', amount: 380000 },
  { date: '06-Jan-25', client: 'Shaadi Bali', product: 'Maintenance and Support', amount: 800000 },
  { date: '08-Jan-25', client: 'The Island Houses', product: 'Microsoft Office 365 Business Basic Licnse', amount: 3000000 },
  { date: '02-Feb-25', client: 'Shaadi Bali', product: 'Maintenance and Support Jan 2025', amount: 800000 },
  { date: '02-Feb-25', client: 'K2 Consulting', product: 'Setup email for K2 Consulting on a new MacBook & iPhone, and fix mail server issues. Assisted with Daxa support. Date: 18 January 2025 (19:00 - 23:00)', amount: 300000 },
  { date: '02-Feb-25', client: 'K2 Consulting', product: 'Setup migration to office 365', amount: 300000 },
  { date: '02-Feb-25', client: 'Waka Hotels Management', product: 'Business Card WK', amount: 180000 },
  { date: '02-Feb-25', client: 'Waka Hotels Management', product: 'Brosur Waka Sailing', amount: 2000000 },
  { date: '11-Feb-25', client: 'Rumah Hari Ceria', product: 'Service and Upgrade SSD', amount: 360000 },
  { date: '11-Feb-25', client: 'Nusabay Menjangan', product: 'Service and setting, uShaadi Bali wifi', amount: 300000 },
  { date: '26-Feb-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '04-Mar-25', client: 'Shaadi Bali', product: 'Maintenance and Support Feb 2025', amount: 800000 },
  { date: '12-Mar-25', client: 'Rumah Hari Ceria', product: 'Antivirus Avast', amount: 450000 },
  { date: '13-Mar-25', client: 'Waka Hotels Management', product: 'Maintenance Website February 2025', amount: 600000 },
  { date: '13-Mar-25', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management January and February 2025', amount: 1180000 },
  { date: '20-Mar-25', client: 'Waka Landcruises', product: 'Brosur Waka Land Cruise', amount: 2000000 },
  { date: '24-Mar-25', client: 'Nicole', product: 'Rental Laptop 10 hari', amount: 500000 },
  { date: '02-Apr-25', client: 'Cili Travel', product: 'eSIM', amount: 320000 },
  { date: '02-Apr-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 360000 },
  { date: '07-Apr-25', client: 'Shaadi Bali', product: 'Maintenance and Support Mar 2025', amount: 800000 },
  { date: '07-Apr-25', client: 'Waka Hotels Management', product: 'Maintenance Website March 2025', amount: 60000 },
  { date: '07-Apr-25', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management March 2025', amount: 350000 },
  { date: '13-Apr-25', client: 'Cili Travel', product: 'eSIM 50GB - 30 days', amount: 580000 },
  { date: '16-Apr-25', client: 'Cili Travel', product: 'eSIM 50GB - 30 days', amount: 580000 },
  { date: '23-Apr-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '23-Apr-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '24-Apr-25', client: 'NY', product: 'eSIM dan SIM Card', amount: 0 },
  { date: '24-Apr-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '26-Apr-25', client: 'Waka Hotels Management', product: 'Tinta Black 2 botol dan yellow 1 botol untuk Bu Maria', amount: 360000 },
  { date: '26-Apr-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4800000 },
  { date: '05-May-25', client: 'Shaadi Bali', product: 'Maintenance and Support Mar 2025', amount: 800000 },
  { date: '12-May-25', client: 'Waka Hotels Management', product: 'Maintenance Website April 2025', amount: 600000 },
  { date: '12-May-25', client: 'Waka Hotels Management', product: 'IT Support Waka Hotels Management April 2025', amount: 400000 },
  { date: '12-May-25', client: 'Happy Trails! Asia', product: 'Modem WIfi', amount: 3600000 },
  { date: '25-May-25', client: 'Happy Trails! Asia', product: 'Modem WIfi', amount: 60000 },
  { date: '03-Jun-25', client: 'Shaadi Bali', product: 'Maintenance and Support Mar 2025', amount: 800000 },
  { date: '03-Jun-25', client: 'Waka Hotels Management', product: 'IT Support Mei 2025', amount: 400000 },

  // Page 4
  { date: '03-Jun-25', client: 'Waka Hotels Management', product: 'Maintenance Website Mei 2025', amount: 600000 },
  { date: '03-Jun-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '09-Jun-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '10-Jun-25', client: 'PT KISS', product: 'Printer HP smart tank 520', amount: 2000000 },
  { date: '11-Jun-25', client: 'Art Design Solutions', product: 'IT Support Mei 2025', amount: 500000 },
  { date: '15-Jun-25', client: 'Mr. Kaul', product: 'Mesin penghancur kertas', amount: 2700000 },
  { date: '23-Jun-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '24-Jun-25', client: 'Stjernegaard', product: 'Monitor Lenovo 24 Inch', amount: 1450000 },
  { date: '03-Jul-25', client: 'Shaadi Bali', product: 'Maintenance and Support Jun 2025', amount: 800000 },
  { date: '03-Jul-25', client: 'Waka Hotels Management', product: 'IT Support Jun 2025', amount: 100000 },
  { date: '03-Jul-25', client: 'Waka Hotels Management', product: 'Maintenance Website Mei 2025', amount: 600000 },
  { date: '03-Jul-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 10800000 },
  { date: '11-Jul-25', client: 'Waka Sailing', product: 'Flyer', amount: 2000000 },
  { date: '14-Jul-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4200000 },
  { date: '15-Jul-25', client: 'Stjernegaard', product: 'eSIM', amount: 560000 },
  { date: '15-Jul-25', client: 'Stjernegaard', product: 'eSIM', amount: 675000 },
  { date: '15-Jul-25', client: 'Stjernegaard', product: 'eSIM', amount: 640000 },
  { date: '16-Jul-25', client: 'Waka Hotels Management', product: 'Business Card WK', amount: 270000 },
  { date: '20-Jul-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 13200000 },
  { date: '28-Jul-25', client: 'Stjernegaard', product: 'eSIM 15GB', amount: 320000 },
  { date: '29-Jul-25', client: 'Waka Hotels Management', product: 'Flyer', amount: 420000 },
  { date: '04-Aug-25', client: 'Shaadi Bali', product: 'Maintenance and Support Jul 2025', amount: 800000 },
  { date: '04-Aug-25', client: 'Waka Hotels Management', product: 'Maintenance Website July 2025', amount: 600000 },
  { date: '04-Aug-25', client: 'Waka Hotels Management', product: 'IT Support July 2025', amount: 650000 },
  { date: '04-Aug-25', client: 'DNB Cargo', product: 'Hosting & Domain', amount: 950000 },
  { date: '05-Aug-25', client: 'Cili Travel', product: 'eSIM', amount: 0 },
  { date: '15-Aug-25', client: 'Waka Hotels Management', product: 'Laptop Acer dan Antivirus dan setting', amount: 0 },
  { date: '15-Aug-25', client: 'Waka Hotels Management', product: 'External HDD 1TB', amount: 1200000 },
  { date: '16-Aug-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '20-Aug-25', client: 'Waka Hotels Management', product: 'antivirus', amount: 145000 },
  { date: '28-Aug-25', client: 'Waka Hotels Management', product: 'Flyer', amount: 400000 },
  { date: '01-Sep-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 6000000 },
  { date: '02-Sep-25', client: 'Waka Hotels Management', product: 'AP dan Cable', amount: 2000000 },
  { date: '02-Sep-25', client: 'Nusabay Menjangan', product: 'CPU dan Monitor', amount: 5850000 },
  { date: '02-Sep-25', client: 'Waka Hotels Management', product: 'Maintenance Website August 2025', amount: 600000 },
  { date: '02-Sep-25', client: 'Waka Hotels Management', product: 'IT Support August 2025', amount: 450000 },
  { date: '03-Sep-25', client: 'Shaadi Bali', product: 'Maintenance and Support August 2025', amount: 800000 },
  { date: '06-Sep-25', client: 'Happy Trails! Asia', product: 'Modem WIfi', amount: 1800000 },
  { date: '08-Sep-25', client: 'Waka Hotels Management', product: 'Business Card WK', amount: 180000 },
  { date: '10-Sep-25', client: 'Cili Travel', product: 'Esim 20GB', amount: 420000 },
  { date: '10-Sep-25', client: 'The Island Houses', product: 'Support', amount: 250000 },
  { date: '10-Sep-25', client: 'Mimpi Indah Luar Kotak', product: 'Support', amount: 200000 },
  { date: '11-Sep-25', client: 'Waka Gae Selaras', product: 'Service and maintenance Printer', amount: 200000 },
  { date: '15-Sep-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 3000000 },
  { date: '16-Sep-25', client: 'Nusabay Menjangan', product: 'CPU dan UPS', amount: 5698000 },
  { date: '16-Sep-25', client: 'Laura', product: '4 unit monitor and laptop stand', amount: 6334000 },
  { date: '17-Sep-25', client: 'Waka Hotels Management', product: 'Flyer 200 lembar', amount: 800000 },
  { date: '18-Sep-25', client: 'Waka Louka Industries', product: 'Lisensi Office 365 Business Basic, 1 thn', amount: 1650000 },
  { date: '25-Sep-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '26-Sep-25', client: 'Art Design Solutions', product: 'Monitor and Braket', amount: 1721000 },
  { date: '02-Oct-25', client: 'Shaadi Bali', product: 'Maintenance and Support September 2025', amount: 800000 },
  { date: '02-Oct-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 7200000 },
  { date: '05-Oct-25', client: 'Waka Hotels Management', product: 'Maintenance and Support September 2025', amount: 600000 },
  { date: '05-Oct-25', client: 'Waka Hotels Management', product: 'IT Support September 2025', amount: 1100000 },
  { date: '10-Oct-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 4200000 },
  { date: '19-Oct-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '19-Oct-25', client: 'Cili Travel', product: 'Esim', amount: 280000 },
  { date: '30-Oct-25', client: 'Cili Travel', product: 'Esim', amount: 1050000 },
  { date: '30-Oct-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 7800000 },
  { date: '06-Nov-25', client: 'Shaadi Bali', product: 'Maintenance and Support October 2025', amount: 800000 },
  { date: '06-Nov-25', client: 'Waka Hotels Management', product: 'Maintenance and Support October 2025', amount: 600000 },
  { date: '06-Nov-25', client: 'Waka Hotels Management', product: 'IT Support October 2025', amount: 1000000 },
  { date: '06-Nov-25', client: 'Waka Hotels Management', product: 'Kartu nama bu wayan 1 box', amount: 90000 },
  { date: '03-Dec-25', client: 'Shaadi Bali', product: 'Maintenance and Support November 2025', amount: 800000 },
  { date: '03-Dec-25', client: 'Waka Hotels Management', product: 'Maintenance and Support November 2025', amount: 600000 },
  { date: '03-Dec-25', client: 'Waka Hotels Management', product: 'IT Support November 2025', amount: 440000 },
  { date: '10-Dec-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 600000 },
  { date: '19-Dec-25', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '05-Jan-26', client: 'Shaadi Bali', product: 'Maintenance and Support December 2025', amount: 800000 },
  { date: '07-Jan-26', client: 'Pratama SPA', product: 'Pembuatan webiste google site', amount: 600000 },
  { date: '07-Jan-26', client: 'Waka Hotels Management', product: 'Maintenance and Support December 2025', amount: 600000 },
  { date: '07-Jan-26', client: 'Waka Hotels Management', product: 'IT Support December 2025', amount: 850000 },
  { date: '09-Jan-26', client: 'The Island Houses', product: 'Perpanjangan Office 365', amount: 3000000 },
  { date: '13-Jan-26', client: 'Cili Travel', product: 'eSIM', amount: 500000 },
  { date: '21-Jan-26', client: 'Cili Travel', product: 'eSIM Top Up', amount: 250000 },

  // Page 5
  { date: '23-Jan-26', client: 'Waka Hotels Management', product: 'Printer HP Ink Tank Smart 580 Print, scan, copy, Wifi', amount: 2500000 },
  { date: '27-Jan-26', client: 'Waka Hotels Management', product: 'SSD dan case', amount: 1350000 },
  { date: '29-Jan-26', client: 'Art Design Solutions', product: 'JASA', amount: 650000 },
  { date: '04-Feb-26', client: 'Shaadi Bali', product: 'Maintenance and Support January 2026', amount: 800000 },
  { date: '07-Feb-26', client: 'Waka Hotels Management', product: 'Maintenance and Support January 2026', amount: 600000 },
  { date: '07-Feb-26', client: 'Waka Hotels Management', product: 'IT Support January 2026', amount: 1150000 },
  { date: '11-Feb-26', client: 'PT Rumah Hari Ceria', product: 'setting printer', amount: 150000 },
  { date: '11-Feb-26', client: 'PT Mimpi Indah Luar Kotak', product: 'Antivirus kaspersky', amount: 145000 },
  { date: '20-Feb-26', client: 'Stjernegaard', product: 'MSI 34 Inch Curved', amount: 10350000 },
  { date: '21-Feb-26', client: 'Stjernegaard', product: 'MSI 34 Inch Curved', amount: 0 },
  { date: '25-Feb-26', client: 'Nusabay Menjangan', product: 'SSD and service', amount: 650000 },
  { date: '02-Mar-26', client: 'Rumah Hari Ceria', product: 'Service and Adaptor', amount: 225000 },
  { date: '07-Mar-26', client: 'Shaadi Bali', product: 'Maintenance and Support January 2026', amount: 800000 },
  { date: '08-Feb-26', client: 'Waka Hotels Management', product: 'Maintenance and Support Website Februay 2026', amount: 600000 },
  { date: '08-Feb-26', client: 'Waka Hotels Management', product: 'IT Support February 2026', amount: 600000 },
  { date: '10-Mar-26', client: 'Stjernegaard', product: 'MSI 34 Inch Curved white', amount: 4495000 },
  { date: '26-Mar-26', client: 'Waka Hotels Management', product: 'Avas premium Antivirus 1 tahun 1 unit', amount: 165000 },
  { date: '26-Mar-26', client: 'Waka Hotels Management', product: 'Avas premium Antivirus 1 tahun 3 unit', amount: 495000 },
  { date: '02-Apr-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1200000 },
  { date: '02-Apr-26', client: 'Shaadi Bali', product: 'Maintenance and Support January 2026', amount: 800000 },
  { date: '08-Apr-26', client: 'Waka Hotels Management', product: 'Maintenance and Support Website Maret 2026', amount: 600000 },
  { date: '08-Apr-26', client: 'Waka Hotels Management', product: 'IT Support Maret 2026', amount: 350000 },
  { date: '18-Apr-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '23-Apr-26', client: 'PT Mimpi Indah Luar Kotak', product: 'maintenance pc bu sri dan eka', amount: 300000 },
  { date: '23-Apr-26', client: 'PT Rumah Hari Ceria', product: 'maintenance and service pc trisna dan raThe Island Houses', amount: 400000 },
  { date: '23-Apr-26', client: 'PT Rumah Hari Ceria', product: 'HDD 500GB and installations', amount: 750000 },
  { date: '23-Apr-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
  { date: '05-May-26', client: 'Shaadi Bali', product: 'Maintenance and Support April 2026', amount: 800000 },
  { date: '05-May-26', client: 'Waka Hotels Management', product: 'Maintenance and Support Website April 2026', amount: 600000 },
  { date: '05-May-26', client: 'Waka Hotels Management', product: 'IT Support April 2026', amount: 600000 },
  { date: '09-May-26', client: 'Art Design Solutions', product: 'Laptop ASUS TUF Gaming F16 and Install', amount: 24799000 },
  { date: '09-May-26', client: 'OTC', product: 'Domain & Hosting, Setup google Workspace', amount: 940000 },
  { date: '12-May-26', client: 'Happy Trails! Asia', product: 'Modem Wifi BAS260511', amount: 1200000 },
  { date: '13-May-26', client: 'Oji Bali', product: 'Maintenance PC& Latop, Activasi Ms Office Endra, Setup secret Key Azure and revoke MFA', amount: 900000 },
  { date: '13-May-26', client: 'Stjernegaard', product: 'Printer HP Smart tank 580 wifi', amount: 2300000 },
  { date: '21-May-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '04-Jun-26', client: 'Shaadi Bali', product: 'Maintenance and Support May 2026', amount: 800000 },
  { date: '07-Jun-26', client: 'Waka Gae Selaras', product: 'Kabel and setting and hdd', amount: 2574000 },
  { date: '07-Jun-26', client: 'Waka Hotels Management', product: 'hdd and backup', amount: 1800000 },
  { date: '07-Jun-26', client: 'Waka Hotels Management', product: 'Maintenance websiteand Support Website Waka Hotels Management May 2026', amount: 900000 },
  { date: '17-Jun-26', client: 'Art Design Solutions', product: 'Service windoWaka Sailing account locked', amount: 200000 },
  { date: '04-Jul-26', client: 'Shaadi Bali', product: 'Maintenance and Support Jun 2026', amount: 800000 },
  { date: '04-Jul-26', client: 'Waka Hotels Management', product: 'Maintenance and Support Jun 2026', amount: 950000 },
  { date: '09-Jul-26', client: 'Happy Trails! Asia', product: 'Modem WIFI', amount: 4200000 },
  { date: '11-Jul-26', client: 'Cili Travel', product: 'Esim 30GB', amount: 350000 },
  { date: '15-Jul-26', client: 'Art Design Solutions', product: 'WindoWaka Sailing 10 Activations', amount: 200000 },
  { date: '15-Jul-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 1800000 },
  { date: '21-Jul-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 6000000 },
  { date: '24-Jul-26', client: 'Happy Trails! Asia', product: 'Modem Wifi', amount: 2400000 },
];

async function runSeed() {
  console.log("=== STARTING INVOICE REPLACEMENT ===");

  // 1. Delete all existing invoice items and invoices
  console.log("Deleting existing invoice_items...");
  await supabase.from("invoice_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  console.log("Deleting existing invoices...");
  await supabase.from("invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 2. Fetch existing clients & insert new unique clients
  console.log("Syncing clients database...");
  const { data: existingClients } = await supabase.from("clients").select("*");
  const clientMap = new Map();

  (existingClients || []).forEach((c) => {
    clientMap.set(c.full_name.toLowerCase(), c.id);
    if (c.company) clientMap.set(c.company.toLowerCase(), c.id);
  });

  const uniqueClients = [...new Set(rawData.map((r) => normalizeClientName(r.client)))];
  for (const clientName of uniqueClients) {
    if (!clientMap.has(clientName.toLowerCase())) {
      console.log(`Adding new client to DB: "${clientName}"`);
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert([
          {
            full_name: clientName,
            company: clientName,
            email: `${clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
          },
        ])
        .select()
        .single();

      if (newClient) {
        clientMap.set(clientName.toLowerCase(), newClient.id);
      } else if (error) {
        console.error(`Error adding client ${clientName}:`, error);
      }
    }
  }

  // 3. Group / prepare invoices sorted by date
  const parsedItems = rawData.map((item) => {
    const isoDate = parseDate(item.date);
    return {
      ...item,
      normalizedClient: normalizeClientName(item.client),
      isoDate,
    };
  });

  // Sort chronologically by date
  parsedItems.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  // Generate monthly sequential invoice numbers: INV-YYYYMM-001, INV-YYYYMM-002...
  const monthCounters = {};
  
  console.log(`Inserting ${parsedItems.length} real invoices...`);

  let successCount = 0;
  for (const row of parsedItems) {
    const clientId = clientMap.get(row.normalizedClient.toLowerCase());
    if (!clientId) {
      console.error(`Client ID missing for ${row.normalizedClient}`);
      continue;
    }

    const yearMonth = row.isoDate.slice(0, 7).replace("-", ""); // e.g. "202308"
    monthCounters[yearMonth] = (monthCounters[yearMonth] || 0) + 1;
    const seqStr = String(monthCounters[yearMonth]).padStart(3, "0");
    const invNumber = `INV-${yearMonth}-${seqStr}`;

    // Compute due_date (+14 days after invoice_date)
    const d = new Date(row.isoDate);
    d.setDate(d.getDate() + 14);
    const dueDate = d.toISOString().split("T")[0];

    // Insert invoice
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert([
        {
          invoice_number: invNumber,
          client_id: clientId,
          invoice_date: row.isoDate,
          due_date: dueDate,
          status: "Paid", // Set as Paid for historical real data
        },
      ])
      .select()
      .single();

    if (invErr || !inv) {
      console.error(`Failed inserting invoice ${invNumber}:`, invErr?.message);
      continue;
    }

    // Insert line item
    const { error: itemErr } = await supabase.from("invoice_items").insert([
      {
        invoice_id: inv.id,
        description: row.product,
        quantity: 1,
        unit_price: row.amount,
        total: row.amount,
      },
    ]);

    if (itemErr) {
      console.error(`Failed inserting item for invoice ${invNumber}:`, itemErr.message);
    } else {
      successCount++;
    }

    // Update total_amount on invoice if column exists
    try {
      await supabase.from("invoices").update({ total_amount: row.amount }).eq("id", inv.id);
    } catch (e) {
      /* ignore if column doesn't exist */
    }
  }

  console.log(`=== REPLACEMENT COMPLETE ===`);
  console.log(`Successfully seeded ${successCount} real invoices into database!`);
}

runSeed().catch(console.error);

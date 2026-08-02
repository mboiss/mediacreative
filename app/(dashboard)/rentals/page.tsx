"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Copy,
  Check,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Radio,
  FileText,
  MapPin,
  Tag,
  SlidersHorizontal,
  X,
  Eye,
  Info,
  ExternalLink,
  Share2,
  Download,
  CheckSquare,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { getTourLeaders, TourLeader } from "@/lib/tour-leaders";
import { useToast } from "@/components/ui/toast";
import { exportToCSV } from "@/lib/export-utils";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export type ModemItem = {
  id: string;
  device_name: string;
  number: string;
  ssid: string;
  password: string;
  status: "Available" | "Rented" | "Maintenance";
  remark?: string;
};

export type TourRentalLog = {
  tourcode: string;
  start_date: string;
  end_date: string;
  days: number;
  qty: number;
  location: string;
  tl: string;
  status: "Running" | "Upcoming" | "Finish" | "Cancel";
  modems: string;
  invoice_status: "Paid" | "Unpaid" | "Pending";
  remark?: string;
  notes?: string;
  device_pax?: Record<string, string>; // e.g. { "MC1": "Miss Julia Aimée", "MC2": "Miss Kimberley" }
};

function parseTourDate(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return Date.now();
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).getTime();
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(parts[0], 10) || 1;
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = months[mStr] !== undefined ? months[mStr] : (parseInt(parts[1], 10) - 1 || 0);
    let year = parseInt(parts[2], 10) || 2026;
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }
  const d = new Date(dateStr).getTime();
  return isNaN(d) || d === 0 ? Date.now() : d;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

const INITIAL_MODEMS: ModemItem[] = [
  { id: "modem-1", device_name: "Orbitmifi_6DF6", number: "081329926886", ssid: "Media Creative 1", password: "MC1#2026", status: "Available" },
  { id: "modem-2", device_name: "Orbitmifi_6DE3", number: "081329926880", ssid: "Media Creative 2", password: "MC2#2026", status: "Available" },
  { id: "modem-3", device_name: "Orbitmifi_4F0A", number: "081264515945", ssid: "Media Creative 3", password: "MC3#2026", status: "Rented", remark: "AIL260716 (TL: Bram Idrus)" },
  { id: "modem-4", device_name: "Orbitmifi_47E7", number: "081398703478", ssid: "Media Creative 4", password: "MC4#2026", status: "Available" },
  { id: "modem-5", device_name: "Orbitmifi_56A5", number: "081398703256", ssid: "Media Creative 5", password: "MC5#2026", status: "Available" },
  { id: "modem-6", device_name: "Orbitmifi_7180", number: "081398733229", ssid: "Media Creative 6", password: "MC6#2026", status: "Available" },
  { id: "modem-7", device_name: "Orbitmifi_6A80", number: "081329924435", ssid: "Media Creative 7", password: "MC7#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-8", device_name: "Orbitmifi_6DF0", number: "081345343604", ssid: "Media Creative 8", password: "MC8#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-9", device_name: "Orbitmifi_6CC0", number: "081329924527", ssid: "Media Creative 9", password: "MC9#2026", status: "Available" },
  { id: "modem-10", device_name: "Orbitmifi_6A92", number: "081329924439", ssid: "Media Creative 10", password: "MC10#2026", status: "Available" },
  { id: "modem-11", device_name: "Orbitmifi_47D5", number: "081398703423", ssid: "Media Creative 11", password: "MC11#2026", status: "Available" },
  { id: "modem-12", device_name: "Orbitmifi_57FD", number: "081398703258", ssid: "Media Creative 12", password: "MC12#2026", status: "Rented", remark: "KIB260722 (TL: Gede Suadnyana)" },
  { id: "modem-13", device_name: "Orbitmifi_58C5", number: "081264516147", ssid: "Media Creative 13", password: "MC13#2026", status: "Available" },
  { id: "modem-14", device_name: "Orbitmifi_58F4", number: "081264515938", ssid: "Media Creative 14", password: "MC14#2026", status: "Available" },
  { id: "modem-15", device_name: "Orbitmifi_7021", number: "081232919331", ssid: "Media Creative 15", password: "MC15#2026", status: "Available" },
  { id: "modem-16", device_name: "Orbitmifi_58D8", number: "081264515931", ssid: "Media Creative 16", password: "MC16#2026", status: "Available" },
  { id: "modem-17", device_name: "Orbitmifi_5976", number: "081264515948", ssid: "Media Creative 17", password: "MC17#2026", status: "Available" },
  { id: "modem-18", device_name: "Orbitmifi_588D", number: "081264515947", ssid: "Media Creative 18", password: "MC18#2026", status: "Available" },
  { id: "modem-19", device_name: "Orbitmifi_5A36", number: "081264515950", ssid: "Media Creative 19", password: "MC19#2026", status: "Rented", remark: "FID260730 (TL: Sofyan)" },
  { id: "modem-20", device_name: "Orbitmifi_587A", number: "081264515935", ssid: "Media Creative 20", password: "MC20#2026", status: "Available" },
  { id: "modem-21", device_name: "Orbitmifi_5941", number: "081264515971", ssid: "Media Creative 21", password: "MC21#2026", status: "Rented", remark: "FID260730 (TL: Sofyan)" },
  { id: "modem-22", device_name: "Orbitmifi_5946", number: "081264516146", ssid: "Media Creative 22", password: "MC22#2026", status: "Available" },
  { id: "modem-23", device_name: "Orbitmifi_5031", number: "081264515951", ssid: "Media Creative 23", password: "MC23#2026", status: "Available" },
  { id: "modem-24", device_name: "Orbitmifi_70A6", number: "081398733261", ssid: "Media Creative 24", password: "MC24#2026", status: "Available" },
  { id: "modem-25", device_name: "Orbitmifi_48C4", number: "081398734462", ssid: "Media Creative 25", password: "MC25#2026", status: "Available" },
  { id: "modem-26", device_name: "Orbitmifi_499B", number: "081232918904", ssid: "Media Creative 26", password: "MC26#2026", status: "Available" },
  { id: "modem-27", device_name: "Orbitmifi_4A10", number: "081232918901", ssid: "Media Creative 27", password: "MC27#2026", status: "Available" },
  { id: "modem-28", device_name: "Orbitmifi_4947", number: "081398734440", ssid: "Media Creative 28", password: "MC28#2026", status: "Available" },
  { id: "modem-29", device_name: "Orbitmifi_4987", number: "081232918902", ssid: "Media Creative 29", password: "MC29#2026", status: "Available" },
  { id: "modem-30", device_name: "Orbitmifi_48DC", number: "081398734437", ssid: "Media Creative 30", password: "MC30#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-31", device_name: "Orbitmifi_4959", number: "081398734447", ssid: "Media Creative 31", password: "MC31#2026", status: "Available" },
  { id: "modem-32", device_name: "Orbitmifi_925B", number: "082310327205", ssid: "Media Creative 32", password: "MC32#2026", status: "Rented", remark: "SOJ260730 (TL: Empong)" },
  { id: "modem-33", device_name: "Orbitmifi_8D50", number: "082310302160", ssid: "Media Creative 33", password: "MC33#2026", status: "Rented", remark: "BAJ260723 (TL: Sugiarto)" },
  { id: "modem-34", device_name: "Orbitmifi_8D4B", number: "082310302178", ssid: "Media Creative 34", password: "MC34#2026", status: "Available" },
  { id: "modem-35", device_name: "Orbitmifi_9725", number: "082310371109", ssid: "Media Creative 35", password: "MC35#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-36", device_name: "Orbitmifi_8D6B", number: "082310302248", ssid: "Media Creative 36", password: "MC36#2026", status: "Rented", remark: "FIS260717 (TL: Linda Samosir)" },
  { id: "modem-37", device_name: "Orbitmifi_8E02", number: "082310302384", ssid: "Media Creative 37", password: "MC37#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-38", device_name: "Orbitmifi_8EC0", number: "082310371129", ssid: "Media Creative 38", password: "MC38#2026", status: "Available" },
  { id: "modem-39", device_name: "Orbitmifi_9726", number: "082310371088", ssid: "Media Creative 39", password: "MC39#2026", status: "Available" },
  { id: "modem-40", device_name: "Orbitmifi_56BD", number: "082130431824", ssid: "Media Creative 40", password: "MC40#2026", status: "Rented", remark: "SOJ260723 (TL: Ophan)" },
  { id: "modem-41", device_name: "Orbitmifi_C823", number: "085313428403", ssid: "Media Creative 41", password: "MC41#2026", status: "Available" },
  { id: "modem-42", device_name: "Orbitmifi_C2DA", number: "085313428598", ssid: "Media Creative 42", password: "MC42#2026", status: "Available" },
];

const MASTER_TOUR_LOGS: TourRentalLog[] = [
  {
    "tourcode": "SOO220528",
    "start_date": "29-May-2022",
    "end_date": "09-Jun-2022",
    "days": 12,
    "qty": 1,
    "location": "Sri Phala Resort And Villa",
    "tl": "Usman",
    "status": "Finish",
    "modems": "NET11",
    "invoice_status": "Paid",
    "remark": "Lombok"
  },
  {
    "tourcode": "SOO220604S",
    "start_date": "05-Jun-2022",
    "end_date": "17-Jun-2022",
    "days": 13,
    "qty": 9,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET01, NET02, NET03, NET04, NET05, NET06, NET07, NET08, NET09",
    "invoice_status": "Paid",
    "remark": "Pax 24"
  },
  {
    "tourcode": "KIB220702",
    "start_date": "03-Jul-2022",
    "end_date": "15-Jul-2022",
    "days": 13,
    "qty": 1,
    "location": "Bhuwana Ubud",
    "tl": "Sofyan Manik",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "12345678990"
  },
  {
    "tourcode": "BAT220702",
    "start_date": "03-Jul-2022",
    "end_date": "14-Jul-2022",
    "days": 12,
    "qty": 3,
    "location": "Champlung Sari Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "NET11",
    "invoice_status": "Paid",
    "remark": "1 modem extend smpe tgl 19, extra charge 300K"
  },
  {
    "tourcode": "AIS220708R",
    "start_date": "09-Jul-2022",
    "end_date": "28-Jul-2022",
    "days": 20,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET04, NET05, NET06, NET07",
    "invoice_status": "Paid",
    "remark": "Flores, net 04 isi lagi 60rb tgll 20 jul"
  },
  {
    "tourcode": "FIO220709P",
    "start_date": "10-Jul-2022",
    "end_date": "21-Jul-2022",
    "days": 12,
    "qty": 1,
    "location": "Ramayana Candidasa",
    "tl": "Andi Kurniawan",
    "status": "Finish",
    "modems": "NET22",
    "invoice_status": "Paid",
    "remark": "kirim 12 Jul.22, J&T"
  },
  {
    "tourcode": "FIB220709P",
    "start_date": "10-Jul-2022",
    "end_date": "21-Jul-2022",
    "days": 12,
    "qty": 4,
    "location": "Bhuwana Ubud",
    "tl": "Panji Sidarta",
    "status": "Finish",
    "modems": "NET12, NET23",
    "invoice_status": "Paid",
    "remark": "Book by Bu Peri Net12 rusak, diganti dengan NET23"
  },
  {
    "tourcode": "KID220714B",
    "start_date": "15-Jul-2022",
    "end_date": "03-Aug-2022",
    "days": 20,
    "qty": 2,
    "location": "Sukajadi Bandung",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "NET1, NET14",
    "invoice_status": "Paid",
    "remark": "Kirim 12 Jul.22"
  },
  {
    "tourcode": "BAJ220714R",
    "start_date": "15-Jul-2022",
    "end_date": "03-Aug-2022",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "NET12, NET15, NET16, NET17, NET18",
    "invoice_status": "Paid",
    "remark": "Book by Bu Peri, kirim tanggal 11 Jul.22"
  },
  {
    "tourcode": "SSN220715",
    "start_date": "16-Jul-2022",
    "end_date": "04-Aug-2022",
    "days": 20,
    "qty": 1,
    "location": "Champlung Sari Ubud",
    "tl": "Pak Yance",
    "status": "Finish",
    "modems": "NET08",
    "invoice_status": "Paid",
    "remark": "Bali Tour"
  },
  {
    "tourcode": "FIO220716B",
    "start_date": "17-Jul-2022",
    "end_date": "29-Jul-2022",
    "days": 12,
    "qty": 1,
    "location": "Champlung Sari Ubud",
    "tl": "Ibu Widi",
    "status": "Finish",
    "modems": "NET09",
    "invoice_status": "Paid",
    "remark": "Book by Bu Peri"
  },
  {
    "tourcode": "SOO220716S",
    "start_date": "17-Jul-2022",
    "end_date": "28-Jul-2022",
    "days": 12,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Pak Usman",
    "status": "Finish",
    "modems": "NET24, NET25",
    "invoice_status": "Paid",
    "remark": "Bali & Lombok"
  },
  {
    "tourcode": "BAT220716R",
    "start_date": "17-Jul-2022",
    "end_date": "28-Jul-2022",
    "days": 12,
    "qty": 1,
    "location": "Champlung Sari Ubud",
    "tl": "Nino Sumdap",
    "status": "Finish",
    "modems": "NET10",
    "invoice_status": "Paid",
    "remark": "Champlung Sari"
  },
  {
    "tourcode": "FIS220716P",
    "start_date": "17-Jul-2022",
    "end_date": "04-Aug-2022",
    "days": 19,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC1, MC2, MC3",
    "invoice_status": "Paid",
    "remark": "Book by Bu Peri, Kirim tanggal 13 Jul.22"
  },
  {
    "tourcode": "FIO220723P",
    "start_date": "24-Jul-2022",
    "end_date": "04-Aug-2022",
    "days": 12,
    "qty": 1,
    "location": "Champlung Sari Ubud",
    "tl": "Andi Kurniawan",
    "status": "Finish",
    "modems": "NET22",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOD220730V",
    "start_date": "31-Jul-2022",
    "end_date": "11-Aug-2022",
    "days": 12,
    "qty": 1,
    "location": "Sri Phala Resort And Villa",
    "tl": "Pak Usman",
    "status": "Finish",
    "modems": "NET25",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "KIB220730C",
    "start_date": "31-Jul-2022",
    "end_date": "11-Aug-2022",
    "days": 12,
    "qty": 5,
    "location": "Bhuwana Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "NET02, NET03, NET04, NET05, NET07",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "BAT220730",
    "start_date": "31-Jul-2022",
    "end_date": "11-Aug-2022",
    "days": 12,
    "qty": 1,
    "location": "Champlung Sari Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "NET09",
    "invoice_status": "Paid",
    "remark": "Bali Banyuwangi"
  },
  {
    "tourcode": "FIO220813B",
    "start_date": "14-Aug-2022",
    "end_date": "25-Aug-2022",
    "days": 13,
    "qty": 3,
    "location": "Sri Aksata Ubud",
    "tl": "Yance",
    "status": "Finish",
    "modems": "NET13, NET14, NET15",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "SOO220813V",
    "start_date": "14-Aug-2022",
    "end_date": "25-Aug-2022",
    "days": 12,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET02, NET03",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "SOO220903S",
    "start_date": "04-Sep-2022",
    "end_date": "15-Sep-2022",
    "days": 12,
    "qty": 3,
    "location": "Swastika Bungalow",
    "tl": "Agus Wiraman",
    "status": "Finish",
    "modems": "NET04, NET05, NET10",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOJ220908S",
    "start_date": "09-Sep-2022",
    "end_date": "28-Sep-2022",
    "days": 20,
    "qty": 8,
    "location": "Favehotel Tanah Abang Cideng",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "NET01, NET02, NET03, NET16, NET17, NET18, NET19, NET20",
    "invoice_status": "Paid",
    "remark": "Jawa & Bali, tamu minta diskon"
  },
  {
    "tourcode": "SOO220910",
    "start_date": "11-Sep-2022",
    "end_date": "22-Sep-2022",
    "days": 12,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET15",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "BAT220910",
    "start_date": "11-Sep-2022",
    "end_date": "22-Sep-2022",
    "days": 12,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Sofyan Manik",
    "status": "Finish",
    "modems": "NET14",
    "invoice_status": "Paid",
    "remark": "bali & Java"
  },
  {
    "tourcode": "BAS220916",
    "start_date": "17-Sep-2022",
    "end_date": "06-Oct-2022",
    "days": 20,
    "qty": 6,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET04, NET05, NET06, NET10, NET21, NET25",
    "invoice_status": "Paid",
    "remark": "Bali, NTB, NTT"
  },
  {
    "tourcode": "BAI220917",
    "start_date": "18-Sep-2022",
    "end_date": "06-Oct-2022",
    "days": 19,
    "qty": 3,
    "location": "Le Polonia Hotel",
    "tl": "Linda Samosir",
    "status": "Finish",
    "modems": "NET07, NET08, NET09",
    "invoice_status": "Paid",
    "remark": "Sumatra, Java & Bali"
  },
  {
    "tourcode": "SOD220924S",
    "start_date": "25-Sep-2022",
    "end_date": "06-Oct-2022",
    "days": 12,
    "qty": 7,
    "location": "Sri Phala Resort And Villa",
    "tl": "Ayu Putu",
    "status": "Finish",
    "modems": "NET12, NET13, NET14, NET15, NET17, NET22, NET23",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "AIS221014R",
    "start_date": "15-Oct-2022",
    "end_date": "03-Nov-2022",
    "days": 20,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Komang Merta",
    "status": "Finish",
    "modems": "NET16, NET19",
    "invoice_status": "Paid",
    "remark": "Bali, NTB, NTT (30GB)"
  },
  {
    "tourcode": "SOD221022S",
    "start_date": "23-Oct-2022",
    "end_date": "03-Nov-2022",
    "days": 12,
    "qty": 6,
    "location": "Sri Phala Resort And Villa",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET10, NET11, NET12, NET13, NET15, NET18",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "AIT221022",
    "start_date": "23-Oct-2022",
    "end_date": "03-Nov-2022",
    "days": 12,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Yance",
    "status": "Finish",
    "modems": "NET14",
    "invoice_status": "Paid",
    "remark": "bali & Java (30GB)"
  },
  {
    "tourcode": "SOJ221103T",
    "start_date": "04-Nov-2022",
    "end_date": "23-Nov-2022",
    "days": 20,
    "qty": 3,
    "location": "Favehotel Tanah Abang Cideng",
    "tl": "Evy",
    "status": "Finish",
    "modems": "NET01, NET02, NET03",
    "invoice_status": "Paid",
    "remark": "Java, Bali, Gili Island (dibawa tamu net03)"
  },
  {
    "tourcode": "BAT221105R",
    "start_date": "06-Nov-2022",
    "end_date": "17-Nov-2022",
    "days": 12,
    "qty": 4,
    "location": "Sri Aksata Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "NET05, NET06, NET07, NET08",
    "invoice_status": "Paid",
    "remark": "Bali Jawa"
  },
  {
    "tourcode": "SOO221112",
    "start_date": "13-Nov-2022",
    "end_date": "24-Nov-2022",
    "days": 12,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "NET11, NET12, NET13, NET15",
    "invoice_status": "Paid",
    "remark": "Bali Lombok Complete"
  },
  {
    "tourcode": "SOO221119V",
    "start_date": "20-Nov-2022",
    "end_date": "01-Dec-2022",
    "days": 12,
    "qty": 6,
    "location": "Swastika Bungalow",
    "tl": "Agus Wiraman",
    "status": "Finish",
    "modems": "NET05, NET06, NET07, NET08, NET16, NET19",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOD221224",
    "start_date": "25-Dec-2022",
    "end_date": "06-Jan-2023",
    "days": 13,
    "qty": 3,
    "location": "Sri Phala Resort And Villa",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET04, NET05, NET12",
    "invoice_status": "Paid",
    "remark": "Bali Tour"
  },
  {
    "tourcode": "FIO221224B",
    "start_date": "25-Dec-2022",
    "end_date": "06-Jan-2023",
    "days": 13,
    "qty": 2,
    "location": "Champlung Sari Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "NET01, NET02",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "AIS230211R",
    "start_date": "12-Feb-2023",
    "end_date": "02-Mar-2023",
    "days": 19,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET02, NET04",
    "invoice_status": "Paid",
    "remark": "Bali, NTB, NTT"
  },
  {
    "tourcode": "SOD230318T",
    "start_date": "19-Mar-2023",
    "end_date": "31-Mar-2023",
    "days": 13,
    "qty": 2,
    "location": "Sanur, Bali",
    "tl": "Ayu Putu",
    "status": "Finish",
    "modems": "NET04, NET05",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "BAT230401",
    "start_date": "02-Apr-2023",
    "end_date": "14-Apr-2023",
    "days": 13,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Sentana",
    "status": "Finish",
    "modems": "NET01, NET02",
    "invoice_status": "Paid",
    "remark": "Ubud, Bali"
  },
  {
    "tourcode": "FIO230422B",
    "start_date": "23-Apr-2023",
    "end_date": "05-May-2023",
    "days": 13,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Yance",
    "status": "Finish",
    "modems": "NET02",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOO230422S",
    "start_date": "23-Apr-2023",
    "end_date": "05-May-2023",
    "days": 13,
    "qty": 6,
    "location": "Sanur, Bali",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET05, NET06, NET09, NET10, NET11, NET21",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "FIB230422",
    "start_date": "23-Apr-2023",
    "end_date": "06-May-2023",
    "days": 14,
    "qty": 1,
    "location": "Bhuwana Ubud",
    "tl": "Andi Kurniawan",
    "status": "Finish",
    "modems": "NET04",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOJ230511",
    "start_date": "12-May-2023",
    "end_date": "31-May-2023",
    "days": 20,
    "qty": 1,
    "location": "Jakarta",
    "tl": "Evy",
    "status": "Finish",
    "modems": "NET09",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOO230513",
    "start_date": "14-May-2023",
    "end_date": "26-May-2023",
    "days": 13,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "NET11, NET21",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "AIS230513R",
    "start_date": "14-May-2023",
    "end_date": "01-Jun-2023",
    "days": 19,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET01, NET02, NET04, NET05, NET06",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOJ230525V",
    "start_date": "26-May-2023",
    "end_date": "14-Jun-2023",
    "days": 20,
    "qty": 8,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "NET12, NET14, NET15, NET16, NET18, NET19, NET20, NET22",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden (Keep monitoring)"
  },
  {
    "tourcode": "SOO230527V",
    "start_date": "28-May-2023",
    "end_date": "09-Jun-2023",
    "days": 13,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "NET10, NET11, NET17, NET21, NET25",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "AIN230609",
    "start_date": "10-Jun-2023",
    "end_date": "29-Jun-2023",
    "days": 20,
    "qty": 5,
    "location": "Sumatra",
    "tl": "Linda Samosir",
    "status": "Finish",
    "modems": "NET01, NET02, NET04, NET05, NET06",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "AIS230610R",
    "start_date": "11-Jun-2023",
    "end_date": "29-Jun-2023",
    "days": 19,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET10",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOJ230615T",
    "start_date": "16-Jun-2023",
    "end_date": "05-Jul-2023",
    "days": 20,
    "qty": 1,
    "location": "Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "NET14",
    "invoice_status": "Paid",
    "remark": "bali & Java"
  },
  {
    "tourcode": "SOD230617T",
    "start_date": "18-Jun-2023",
    "end_date": "30-Jun-2023",
    "days": 13,
    "qty": 2,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "NET15, NET16",
    "invoice_status": "Paid",
    "remark": "Bali (NET15 20GB, NET16 16GB)"
  },
  {
    "tourcode": "SOO230617T",
    "start_date": "18-Jun-2023",
    "end_date": "30-Jun-2023",
    "days": 13,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "NET12, NET21",
    "invoice_status": "Paid",
    "remark": "Bali and Lombok (NET12 19GB, NET21 16GB)"
  },
  {
    "tourcode": "BAT230701R",
    "start_date": "02-Jul-2023",
    "end_date": "14-Jul-2023",
    "days": 13,
    "qty": 5,
    "location": "Sri Aksata Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "NET17, NET18, NET19, NET20, NET22",
    "invoice_status": "Paid",
    "remark": "Bali en Java (all 28GB)"
  },
  {
    "tourcode": "AIS230707R",
    "start_date": "08-Jul-2023",
    "end_date": "27-Jul-2023",
    "days": 20,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "NET01",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden (25GB)"
  },
  {
    "tourcode": "KIO230708P",
    "start_date": "09-Jul-2023",
    "end_date": "21-Jul-2023",
    "days": 13,
    "qty": 6,
    "location": "Sens Hotel Ubud",
    "tl": "Yance",
    "status": "Finish",
    "modems": "NET05, NET10, NET12, NET14, NET15, NET16, NET20",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIT230708R",
    "start_date": "09-Jul-2023",
    "end_date": "21-Jul-2023",
    "days": 13,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "NET09",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java"
  },
  {
    "tourcode": "SOO230714S",
    "start_date": "15-Jul-2023",
    "end_date": "27-Jul-2023",
    "days": 13,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Ayu Putu",
    "status": "Finish",
    "modems": "NET08, NET21, NET11, NET25, MC3",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "FIO230715",
    "start_date": "16-Jul-2023",
    "end_date": "28-Jul-2023",
    "days": 13,
    "qty": 2,
    "location": "B.Saya Villa Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "NET17, NET18",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "FIO230715B",
    "start_date": "16-Jul-2023",
    "end_date": "28-Jul-2023",
    "days": 13,
    "qty": 4,
    "location": "Sens Hotel Ubud",
    "tl": "Andi Kurniawan",
    "status": "Finish",
    "modems": "NET13, NET19, NET22, NET26",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "FIS230715P",
    "start_date": "16-Jul-2023",
    "end_date": "03-Aug-2023",
    "days": 19,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "NET02, NET04, NET06",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie Totaal"
  },
  {
    "tourcode": "FIO230722P",
    "start_date": "23-Jul-2023",
    "end_date": "04-Aug-2023",
    "days": 13,
    "qty": 7,
    "location": "Sens Hotel Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "NET09, NET10, NET12, NET16, NET20, MC13, MC14",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "FIS230722B",
    "start_date": "23-Jul-2023",
    "end_date": "10-Aug-2023",
    "days": 19,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Linda Samosir",
    "status": "Finish",
    "modems": "MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie Totaal"
  },
  {
    "tourcode": "AIS230724",
    "start_date": "25-Jul-2023",
    "end_date": "13-Aug-2023",
    "days": 20,
    "qty": 10,
    "location": "Swastika Bungalow",
    "tl": "Yance",
    "status": "Finish",
    "modems": "MC6, MC7, MC8, MC9, MC10, MC11, MC12, NET14, MC15, MC23",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "FID230728B",
    "start_date": "29-Jul-2023",
    "end_date": "17-Aug-2023",
    "days": 20,
    "qty": 2,
    "location": "Sukajadi Hotel (Bandung)",
    "tl": "Maureen",
    "status": "Finish",
    "modems": "MC16, MC17",
    "invoice_status": "Paid",
    "remark": "Indonesie Avontuur"
  },
  {
    "tourcode": "SOO230728V",
    "start_date": "29-Jul-2023",
    "end_date": "10-Aug-2023",
    "days": 13,
    "qty": 10,
    "location": "Sriphala Resort & Spa Sanur",
    "tl": "Usman",
    "status": "Finish",
    "modems": "MC3, NET11, NET13, NET17, NET18, NET19, NET21, NET22, NET25, MC26",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "KIB230728B",
    "start_date": "29-Jul-2023",
    "end_date": "10-Aug-2023",
    "days": 13,
    "qty": 2,
    "location": "Bhuwana Hotel Ubud",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC1, MC2",
    "invoice_status": "Paid",
    "remark": "Familireis Indonesie Bali Cultur"
  },
  {
    "tourcode": "AIL230728R",
    "start_date": "29-Jul-2023",
    "end_date": "17-Aug-2023",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "MC18, MC19, MC20, MC21, MC22",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "KIO230729C",
    "start_date": "30-Jul-2023",
    "end_date": "11-Aug-2023",
    "days": 13,
    "qty": 1,
    "location": "Sens Hotel Ubud",
    "tl": "Agus Wiraman",
    "status": "Finish",
    "modems": "MC9",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIN230804R",
    "start_date": "05-Aug-2023",
    "end_date": "24-Aug-2023",
    "days": 20,
    "qty": 1,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC24",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOJ230804S",
    "start_date": "05-Aug-2023",
    "end_date": "24-Aug-2023",
    "days": 20,
    "qty": 5,
    "location": "Favehotel Tanah Abang Cideng",
    "tl": "Arlhian Fahar",
    "status": "Finish",
    "modems": "MC27, MC28, MC29, MC30, MC31",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIL230804",
    "start_date": "05-Aug-2023",
    "end_date": "24-Aug-2023",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC25, MC26, NET02, NET04, NET06",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOD230902T",
    "start_date": "03-Sep-2023",
    "end_date": "15-Sep-2023",
    "days": 13,
    "qty": 2,
    "location": "Sri Phala Sanur",
    "tl": "Ayu Putu",
    "status": "Finish",
    "modems": "MC1, MC2",
    "invoice_status": "Paid",
    "remark": "Bali only"
  },
  {
    "tourcode": "SOO230902S",
    "start_date": "03-Sep-2023",
    "end_date": "15-Sep-2023",
    "days": 13,
    "qty": 5,
    "location": "Abian Harmony Hotel",
    "tl": "Agus Wiraman",
    "status": "Finish",
    "modems": "MC3, MC4, MC5, MC6, MC7",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "SOJ230907T",
    "start_date": "08-Sep-2023",
    "end_date": "27-Sep-2023",
    "days": 20,
    "qty": 7,
    "location": "Favehotel Tanah Abang Cideng",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC8, MC9, MC10, MC11, MC12, MC13, MC14",
    "invoice_status": "Paid",
    "remark": "Indonesie: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIL230907R",
    "start_date": "08-Sep-2023",
    "end_date": "27-Sep-2023",
    "days": 20,
    "qty": 2,
    "location": "Erian Hotel Jakarta",
    "tl": "Edy Suryawan",
    "status": "Finish",
    "modems": "MC15, MC16",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOD230909V",
    "start_date": "10-Sep-2023",
    "end_date": "22-Sep-2023",
    "days": 13,
    "qty": 8,
    "location": "Sri Phala Resort And Villa",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC17, MC18, MC19, MC20, MC21, MC22, MC23, MC29",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "BAT230909R",
    "start_date": "10-Sep-2023",
    "end_date": "22-Sep-2023",
    "days": 13,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC25",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java - Ms. Emma Stas"
  },
  {
    "tourcode": "AIN230915",
    "start_date": "16-Sep-2023",
    "end_date": "05-Oct-2023",
    "days": 20,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC27, MC29",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SSN230916",
    "start_date": "17-Sep-2023",
    "end_date": "05-Oct-2023",
    "days": 19,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Subhan Saputra",
    "status": "Finish",
    "modems": "MC4, MC2",
    "invoice_status": "Paid",
    "remark": "Rondreis Soenda eilanden"
  },
  {
    "tourcode": "SOO230916V",
    "start_date": "17-Sep-2023",
    "end_date": "29-Sep-2023",
    "days": 13,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Usman",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "BAS230916",
    "start_date": "17-Sep-2023",
    "end_date": "05-Oct-2023",
    "days": 19,
    "qty": 3,
    "location": "Sanur, Bali",
    "tl": "Komang Merta",
    "status": "Finish",
    "modems": "MC28, MC30, MC31",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOD230923S",
    "start_date": "24-Sep-2023",
    "end_date": "06-Oct-2023",
    "days": 13,
    "qty": 6,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC17, MC19, MC20, MC21, MC22, MC23",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali (satu modem rusak)"
  },
  {
    "tourcode": "SOO230923",
    "start_date": "24-Sep-2023",
    "end_date": "06-Oct-2023",
    "days": 13,
    "qty": 3,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC5, MC6, MC7",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "SOO230930S",
    "start_date": "01-Oct-2023",
    "end_date": "13-Oct-2023",
    "days": 13,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Agus Wiraman",
    "status": "Finish",
    "modems": "MC30",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIL231005",
    "start_date": "06-Oct-2023",
    "end_date": "25-Oct-2023",
    "days": 20,
    "qty": 2,
    "location": "Erian Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC3, MC18",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIN231006",
    "start_date": "07-Oct-2023",
    "end_date": "26-Oct-2023",
    "days": 20,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC27, MC29",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOO231014V",
    "start_date": "15-Oct-2023",
    "end_date": "27-Oct-2023",
    "days": 13,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC4, MC5, MC27, MC28",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIS231014R",
    "start_date": "15-Oct-2023",
    "end_date": "02-Nov-2023",
    "days": 19,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC6, MC7, MC8, MC9",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOD231021S",
    "start_date": "22-Oct-2023",
    "end_date": "03-Nov-2023",
    "days": 13,
    "qty": 2,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC22, MC23",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali (satu modem rusak)"
  },
  {
    "tourcode": "BAI231103",
    "start_date": "04-Nov-2023",
    "end_date": "23-Nov-2023",
    "days": 20,
    "qty": 1,
    "location": "Le Polonia Hotel Medan",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC3",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOD231118V",
    "start_date": "19-Nov-2023",
    "end_date": "01-Dec-2023",
    "days": 13,
    "qty": 5,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC1, MC6, MC8, MC10, MC24",
    "invoice_status": "Paid",
    "remark": "Bali (cek kuota tgl 25 nov)"
  },
  {
    "tourcode": "SOO231209V",
    "start_date": "10-Dec-2023",
    "end_date": "22-Dec-2023",
    "days": 13,
    "qty": 3,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC2, MC7, MC9",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "SOD231223T",
    "start_date": "24-Dec-2023",
    "end_date": "05-Jan-2024",
    "days": 13,
    "qty": 4,
    "location": "Sriphala Resort & Spa Sanur",
    "tl": "Ayu Putu",
    "status": "Finish",
    "modems": "MC1, MC6, MC8, MC10",
    "invoice_status": "Paid",
    "remark": "Bali Tour"
  },
  {
    "tourcode": "SOO231223",
    "start_date": "24-Dec-2023",
    "end_date": "05-Jan-2024",
    "days": 13,
    "qty": 2,
    "location": "Bhumas Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Bali en Lombok"
  },
  {
    "tourcode": "FIB231223B",
    "start_date": "24-Dec-2023",
    "end_date": "05-Jan-2024",
    "days": 13,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC11, MC12",
    "invoice_status": "Paid",
    "remark": "Indonesie Bali Cultuur & Strand"
  },
  {
    "tourcode": "BAT231223",
    "start_date": "24-Dec-2023",
    "end_date": "05-Jan-2024",
    "days": 13,
    "qty": 10,
    "location": "Sri Aksata Ubud",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC13, MC16, MC18, MC19, MC20, MC22, MC23, MC26, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Bali en Java"
  },
  {
    "tourcode": "AIS240210R",
    "start_date": "11-Feb-2024",
    "end_date": "01-Mar-2024",
    "days": 20,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC7",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOJ240307S",
    "start_date": "08-Mar-2024",
    "end_date": "27-Mar-2024",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1, MC2, MC6, MC7, MC8",
    "invoice_status": "Paid",
    "remark": "Java, Bali & Lombok"
  },
  {
    "tourcode": "FIO240420C",
    "start_date": "21-Apr-2024",
    "end_date": "03-May-2024",
    "days": 13,
    "qty": 6,
    "location": "B.Saya Villa Ubud",
    "tl": "Pak Yance",
    "status": "Finish",
    "modems": "MC1, MC2, MC6, MC7, MC8, MC24",
    "invoice_status": "Paid",
    "remark": "Bali & Lombok"
  },
  {
    "tourcode": "AIS240422",
    "start_date": "23-Apr-2024",
    "end_date": "12-May-2024",
    "days": 20,
    "qty": 3,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC3, MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOD240429S",
    "start_date": "30-Apr-2024",
    "end_date": "12-May-2024",
    "days": 13,
    "qty": 4,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC11, MC12, MC14, MC16",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO240429V",
    "start_date": "30-Apr-2024",
    "end_date": "12-May-2024",
    "days": 13,
    "qty": 6,
    "location": "Swastika Bungalow",
    "tl": "Subhan Saputra",
    "status": "Finish",
    "modems": "MC26, MC27, MC28, MC29, MC30, MC31",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIT240429",
    "start_date": "30-Apr-2024",
    "end_date": "12-May-2024",
    "days": 13,
    "qty": 7,
    "location": "Sri Aksata Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC10, MC18, MC19, MC20, MC21, MC23, MC25",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java"
  },
  {
    "tourcode": "AIL240509",
    "start_date": "10-May-2024",
    "end_date": "29-May-2024",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC1, MC2, MC6, MC7, MC8",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIN240510R",
    "start_date": "11-May-2024",
    "end_date": "30-May-2024",
    "days": 20,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC17, MC24",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOD240511V",
    "start_date": "12-May-2024",
    "end_date": "24-May-2024",
    "days": 13,
    "qty": 8,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC11, MC12, MC14, MC16, MC26, MC27, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SSN240513S",
    "start_date": "14-May-2024",
    "end_date": "02-Jun-2024",
    "days": 20,
    "qty": 3,
    "location": "Puri Padi (Ubud)",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC3, MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Rondreis Soenda eilanden"
  },
  {
    "tourcode": "SOJ240523V",
    "start_date": "24-May-2024",
    "end_date": "12-Jun-2024",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC9, MC10, MC18, MC20, MC30",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOD240526",
    "start_date": "27-May-2024",
    "end_date": "08-Jun-2024",
    "days": 13,
    "qty": 4,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC11, MC12, MC13, MC14",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO240526S",
    "start_date": "27-May-2024",
    "end_date": "08-Jun-2024",
    "days": 13,
    "qty": 9,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC16, MC19, MC21, MC23, MC25, MC26, MC27, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIN240607",
    "start_date": "08-Jun-2024",
    "end_date": "27-Jun-2024",
    "days": 20,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC1, MC6, MC24",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOJ240613T",
    "start_date": "14-Jun-2024",
    "end_date": "03-Jul-2024",
    "days": 20,
    "qty": 3,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC9, MC10, MC18",
    "invoice_status": "Paid",
    "remark": "Indonesie: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIL240613",
    "start_date": "14-Jun-2024",
    "end_date": "03-Jul-2024",
    "days": 20,
    "qty": 5,
    "location": "Jambuluwuk Thamrin Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC3, MC4, MC5, MC17, MC31",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOD240622S",
    "start_date": "23-Jun-2024",
    "end_date": "05-Jul-2024",
    "days": 13,
    "qty": 6,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC2, MC7, MC8, MC11, MC12, MC13",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO240622T",
    "start_date": "23-Jun-2024",
    "end_date": "05-Jul-2024",
    "days": 13,
    "qty": 6,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC16, MC19, MC23, MC25, MC28, MC30",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "SOD240706V",
    "start_date": "07-Jul-2024",
    "end_date": "19-Jul-2024",
    "days": 13,
    "qty": 4,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC16, MC23, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Sanur Bali"
  },
  {
    "tourcode": "KIO240706B",
    "start_date": "07-Jul-2024",
    "end_date": "19-Jul-2024",
    "days": 13,
    "qty": 1,
    "location": "Sens Hotel Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC25",
    "invoice_status": "Paid",
    "remark": "Sens Hotel Ubud"
  },
  {
    "tourcode": "FIS240709B",
    "start_date": "10-Jul-2024",
    "end_date": "29-Jul-2024",
    "days": 20,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC1, MC6, MC24",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie Totaal"
  },
  {
    "tourcode": "FIO240710C",
    "start_date": "11-Jul-2024",
    "end_date": "23-Jul-2024",
    "days": 13,
    "qty": 2,
    "location": "Sens Hotel Ubud",
    "tl": "Pak Yance",
    "status": "Finish",
    "modems": "MC9, MC10",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "BAJ240711R",
    "start_date": "12-Jul-2024",
    "end_date": "31-Jul-2024",
    "days": 20,
    "qty": 1,
    "location": "Jambuluwuk Thamrin Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC7",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "FIO240713P",
    "start_date": "14-Jul-2024",
    "end_date": "26-Jul-2024",
    "days": 13,
    "qty": 4,
    "location": "Sens Hotel Ubud",
    "tl": "Hendra Limadarma",
    "status": "Finish",
    "modems": "MC2, MC3, MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "SOO240713S",
    "start_date": "14-Jul-2024",
    "end_date": "26-Jul-2024",
    "days": 13,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC17, MC18, MC19, MC20, MC21",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIN240716",
    "start_date": "17-Jul-2024",
    "end_date": "05-Aug-2024",
    "days": 20,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC12, MC13",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali (sent to pak arfan)"
  },
  {
    "tourcode": "AIS240716",
    "start_date": "17-Jul-2024",
    "end_date": "05-Aug-2024",
    "days": 20,
    "qty": 3,
    "location": "Sri Phala Resort And Villa",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC34, MC35, MC36",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "SOD240717S",
    "start_date": "18-Jul-2024",
    "end_date": "30-Jul-2024",
    "days": 13,
    "qty": 5,
    "location": "Bumas Hotel Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "BAT240717",
    "start_date": "18-Jul-2024",
    "end_date": "30-Jul-2024",
    "days": 13,
    "qty": 5,
    "location": "Sri Aksata Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC6, MC7, MC8, MC9, MC10",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java"
  },
  {
    "tourcode": "FID240718B",
    "start_date": "19-Jul-2024",
    "end_date": "07-Aug-2024",
    "days": 20,
    "qty": 4,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "MC8, MC11, MC14, MC26",
    "invoice_status": "Paid",
    "remark": "Indonesie Avontuur (modem sent)"
  },
  {
    "tourcode": "AIL240718",
    "start_date": "19-Jul-2024",
    "end_date": "07-Aug-2024",
    "days": 20,
    "qty": 3,
    "location": "Jambuluwuk Thamrin Hotel Jakarta",
    "tl": "Padang Suwantoro",
    "status": "Finish",
    "modems": "MC27, MC31, MC32",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden (modem sent)"
  },
  {
    "tourcode": "SOO240720V",
    "start_date": "21-Jul-2024",
    "end_date": "20-Aug-2024",
    "days": 30,
    "qty": 5,
    "location": "Sri Phala Resort And Villa",
    "tl": "Ell Pratama",
    "status": "Finish",
    "modems": "MC16, MC23, MC25, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "KIO240724",
    "start_date": "25-Jul-2024",
    "end_date": "06-Aug-2024",
    "days": 13,
    "qty": 4,
    "location": "Sens Hotel Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC7, MC8, MC12, MC15",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok (Mussche Family, Wittenberg Family)"
  },
  {
    "tourcode": "FID240725C",
    "start_date": "26-Jul-2024",
    "end_date": "14-Aug-2024",
    "days": 20,
    "qty": 2,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Yovi Trisna",
    "status": "Finish",
    "modems": "MC33, NET11",
    "invoice_status": "Paid",
    "remark": "Indonesie Avontuur"
  },
  {
    "tourcode": "AIL240725R",
    "start_date": "26-Jul-2024",
    "end_date": "14-Aug-2024",
    "days": 20,
    "qty": 6,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4, MC5, NET17",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "FIO240727B",
    "start_date": "28-Jul-2024",
    "end_date": "09-Aug-2024",
    "days": 13,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Pak Yance",
    "status": "Finish",
    "modems": "MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIS240730R",
    "start_date": "31-Jul-2024",
    "end_date": "19-Aug-2024",
    "days": 20,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Subhan Saputra",
    "status": "Finish",
    "modems": "MC24",
    "invoice_status": "Paid",
    "remark": "Familiereis Indonesie Totaal"
  },
  {
    "tourcode": "FIS240730P",
    "start_date": "31-Jul-2024",
    "end_date": "19-Aug-2024",
    "days": 20,
    "qty": 1,
    "location": "Le Polonia Hotel Medan",
    "tl": "Linda Samosir",
    "status": "Finish",
    "modems": "MC2",
    "invoice_status": "Paid",
    "remark": "Le Polonial"
  },
  {
    "tourcode": "FIO240731C",
    "start_date": "01-Aug-2024",
    "end_date": "13-Aug-2024",
    "days": 13,
    "qty": 1,
    "location": "Sens Hotel Ubud",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC6",
    "invoice_status": "Paid",
    "remark": "Sens Hotel Ubud"
  },
  {
    "tourcode": "SOO240731S",
    "start_date": "01-Aug-2024",
    "end_date": "13-Aug-2024",
    "days": 13,
    "qty": 6,
    "location": "Swastika Bungalow",
    "tl": "Pak Usman",
    "status": "Finish",
    "modems": "MC20, MC35, NET1, NET2, NET3, NET8",
    "invoice_status": "Paid",
    "remark": "Lombok, Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "BAT240731",
    "start_date": "01-Aug-2024",
    "end_date": "13-Aug-2024",
    "days": 13,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Widi Astuti",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java"
  },
  {
    "tourcode": "FID240801P",
    "start_date": "02-Aug-2024",
    "end_date": "21-Aug-2024",
    "days": 20,
    "qty": 4,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC17, MC18, MC19, MC21",
    "invoice_status": "Paid",
    "remark": "Indonesie Avontuur (1 Modem dibalikin, sisanya 1o1)"
  },
  {
    "tourcode": "AIL240801R",
    "start_date": "02-Aug-2024",
    "end_date": "21-Aug-2024",
    "days": 20,
    "qty": 1,
    "location": "Jambuluwuk Thamrin Hotel Jakarta",
    "tl": "Halim Karnadi",
    "status": "Finish",
    "modems": "MC3",
    "invoice_status": "Paid",
    "remark": "Jambuluwuk Thamrin"
  },
  {
    "tourcode": "FIO240803P",
    "start_date": "04-Aug-2024",
    "end_date": "16-Aug-2024",
    "days": 13,
    "qty": 4,
    "location": "Sens Hotel Ubud",
    "tl": "Andi Septanto Kurnia",
    "status": "Finish",
    "modems": "MC23, MC25, MC28, MC29",
    "invoice_status": "Paid",
    "remark": "Rubio Pty, DeCoster Pty, Vandendael Pty x2"
  },
  {
    "tourcode": "AIN240806E",
    "start_date": "07-Aug-2024",
    "end_date": "26-Aug-2024",
    "days": 20,
    "qty": 1,
    "location": "Medan, Polonia Hotel",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC34",
    "invoice_status": "Paid",
    "remark": "Medan Tour"
  },
  {
    "tourcode": "AIN240806",
    "start_date": "07-Aug-2024",
    "end_date": "27-Aug-2024",
    "days": 20,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC12, MC13, MC16",
    "invoice_status": "Paid",
    "remark": "Ms. Arfman, Olijslag pty, Ms. DEZUTTERE"
  },
  {
    "tourcode": "FIS240806B",
    "start_date": "07-Aug-2024",
    "end_date": "26-Aug-2024",
    "days": 20,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Maureen",
    "status": "Finish",
    "modems": "MC37, MC38, NET06",
    "invoice_status": "Paid",
    "remark": "Sumatra & Bali"
  },
  {
    "tourcode": "FIO240807C",
    "start_date": "08-Aug-2024",
    "end_date": "20-Aug-2024",
    "days": 13,
    "qty": 3,
    "location": "Sens Hotel Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC10, MC39, MC40",
    "invoice_status": "Paid",
    "remark": "baru dibayar 1, sisa 2"
  },
  {
    "tourcode": "SOO240807V",
    "start_date": "09-Aug-2024",
    "end_date": "20-Aug-2024",
    "days": 12,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Ell Pratama",
    "status": "Finish",
    "modems": "MC9, MC14, MC27, MC30, MC32",
    "invoice_status": "Paid",
    "remark": "Ms.Uludogan, Mr. Den Boer, Ms. Hummel, Ms. de Jong, Mr. Barneveld"
  },
  {
    "tourcode": "SOJ240808",
    "start_date": "09-Aug-2024",
    "end_date": "28-Aug-2024",
    "days": 20,
    "qty": 2,
    "location": "Erian Hotel Jakarta",
    "tl": "Arlhian Fahar",
    "status": "Finish",
    "modems": "MC11, MC26",
    "invoice_status": "Paid",
    "remark": "Mr. Zijtveld, Pty Dittmar"
  },
  {
    "tourcode": "FID240808C",
    "start_date": "10-Aug-2024",
    "end_date": "28-Aug-2024",
    "days": 19,
    "qty": 1,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "MC8",
    "invoice_status": "Paid",
    "remark": "Bandung Tour"
  },
  {
    "tourcode": "FIB240810B",
    "start_date": "11-Aug-2024",
    "end_date": "23-Aug-2024",
    "days": 13,
    "qty": 3,
    "location": "Bhuwana Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC4, MC31, MC36",
    "invoice_status": "Paid",
    "remark": "1 modem bayar langsung dari TL"
  },
  {
    "tourcode": "SOJ240905V",
    "start_date": "06-Sep-2024",
    "end_date": "25-Sep-2024",
    "days": 20,
    "qty": 10,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4, MC5, MC6, MC8, MC9, MC10, MC12",
    "invoice_status": "Paid",
    "remark": "Indonesie: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "BAJ240905R",
    "start_date": "06-Sep-2024",
    "end_date": "25-Sep-2024",
    "days": 20,
    "qty": 4,
    "location": "Jambuluwuk Thamrin Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC11, MC13, MC14, MC26",
    "invoice_status": "Paid",
    "remark": "Rondreis Indonesië: Java, Bali en Gili eilanden (2 modem sudah dibawa)"
  },
  {
    "tourcode": "SOD240907T",
    "start_date": "08-Sep-2024",
    "end_date": "20-Sep-2024",
    "days": 13,
    "qty": 4,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO240907S",
    "start_date": "08-Sep-2024",
    "end_date": "20-Sep-2024",
    "days": 13,
    "qty": 3,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC5, MC6, MC7",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIT240907",
    "start_date": "08-Sep-2024",
    "end_date": "20-Sep-2024",
    "days": 13,
    "qty": 6,
    "location": "Sri Aksata Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC8, MC9, MC10, MC12, MC15, MC16",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Java"
  },
  {
    "tourcode": "AIS240916",
    "start_date": "17-Sep-2024",
    "end_date": "06-Oct-2024",
    "days": 20,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Komang Merta",
    "status": "Finish",
    "modems": "MC17, MC18, MC19, MC20, MC21",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "BAI240920R",
    "start_date": "21-Sep-2024",
    "end_date": "10-Oct-2024",
    "days": 20,
    "qty": 4,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC22, MC23, MC24, MC25",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOD240928ACS",
    "start_date": "29-Sep-2024",
    "end_date": "10-Oct-2024",
    "days": 13,
    "qty": 4,
    "location": "Sriphala Resort & Spa Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC2, MC3, MC4, MC5",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO240928T",
    "start_date": "29-Sep-2024",
    "end_date": "10-Oct-2024",
    "days": 13,
    "qty": 3,
    "location": "Sriphala Resort & Spa Sanur",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC38, MC39, MC40",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "SOJ241003T",
    "start_date": "04-Oct-2024",
    "end_date": "23-Oct-2024",
    "days": 20,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC6, MC8, MC9, MC10, MC11",
    "invoice_status": "Paid",
    "remark": "Indonesie: Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "AIL241003",
    "start_date": "04-Oct-2024",
    "end_date": "23-Oct-2024",
    "days": 20,
    "qty": 6,
    "location": "Jambuluwuk Thamrin Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC12, MC13, MC14, MC15, MC16, MC17",
    "invoice_status": "Paid",
    "remark": "Ms. Blommaart, Ms. van der Put, Pty Valkenburg, Ms. de Jong, Pty DE COCK, Pty Vernes"
  },
  {
    "tourcode": "AIS241007R",
    "start_date": "08-Oct-2024",
    "end_date": "27-Oct-2024",
    "days": 20,
    "qty": 1,
    "location": "Sri Phala Sanur",
    "tl": "Komang Merta",
    "status": "Finish",
    "modems": "MC18",
    "invoice_status": "Paid",
    "remark": "Rondreis Sunda Eilanden"
  },
  {
    "tourcode": "BAI241011",
    "start_date": "12-Oct-2024",
    "end_date": "31-Oct-2024",
    "days": 20,
    "qty": 5,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC17, MC19, MC21, MC41, MC42",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "SOD241012V",
    "start_date": "13-Oct-2024",
    "end_date": "25-Oct-2024",
    "days": 13,
    "qty": 2,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC2, MC4",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali"
  },
  {
    "tourcode": "SOO241012V",
    "start_date": "13-Oct-2024",
    "end_date": "25-Oct-2024",
    "days": 13,
    "qty": 2,
    "location": "Abian Harmony Hotel Sanur",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC38, MC39",
    "invoice_status": "Paid",
    "remark": "Indonesie: Bali en Lombok"
  },
  {
    "tourcode": "AIN241018R",
    "start_date": "19-Oct-2024",
    "end_date": "07-Nov-2024",
    "days": 20,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC3, MC5, MC40",
    "invoice_status": "Paid",
    "remark": "Kirim ke Pak Arfan"
  },
  {
    "tourcode": "BAS241021R",
    "start_date": "22-Oct-2024",
    "end_date": "10-Nov-2024",
    "days": 20,
    "qty": 2,
    "location": "HT Office Sanur",
    "tl": "Piter",
    "status": "Finish",
    "modems": "MC36, MC37",
    "invoice_status": "Paid",
    "remark": "Bali Lombok"
  },
  {
    "tourcode": "SOJ241031S",
    "start_date": "01-Nov-2024",
    "end_date": "20-Nov-2024",
    "days": 20,
    "qty": 4,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC6, MC8, MC9, MC10",
    "invoice_status": "Paid",
    "remark": "WIFIindonesie (Mr. Vermeulen, Mr. Eikendal, Ms. Schrans)"
  },
  {
    "tourcode": "SOD241103T",
    "start_date": "04-Nov-2024",
    "end_date": "16-Nov-2024",
    "days": 13,
    "qty": 3,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC35, MC38, MC39",
    "invoice_status": "Paid",
    "remark": "Bali Tour"
  },
  {
    "tourcode": "SOO241103S",
    "start_date": "04-Nov-2024",
    "end_date": "16-Nov-2024",
    "days": 13,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC41, MC42",
    "invoice_status": "Paid",
    "remark": "Bali & Lombok"
  },
  {
    "tourcode": "AIN241108",
    "start_date": "09-Nov-2024",
    "end_date": "28-Nov-2024",
    "days": 20,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC17, MC19, MC21",
    "invoice_status": "Paid",
    "remark": "Sumatra & Bali"
  },
  {
    "tourcode": "SOD241123T",
    "start_date": "24-Nov-2024",
    "end_date": "06-Dec-2024",
    "days": 13,
    "qty": 3,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC20, MC25, MC27",
    "invoice_status": "Paid",
    "remark": "Sri Phala Sanur"
  },
  {
    "tourcode": "FIO241221C",
    "start_date": "22-Dec-2024",
    "end_date": "03-Jan-2025",
    "days": 13,
    "qty": 3,
    "location": "Sens Hotel Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC19, MC20, MC25",
    "invoice_status": "Paid",
    "remark": "Ubud & Lombok"
  },
  {
    "tourcode": "BAT241221R",
    "start_date": "22-Dec-2024",
    "end_date": "03-Jan-2025",
    "days": 13,
    "qty": 2,
    "location": "Sri Phala Sanur",
    "tl": "Sofyan Manik",
    "status": "Finish",
    "modems": "MC9, MC10",
    "invoice_status": "Paid",
    "remark": "Sri Phala Sanur"
  },
  {
    "tourcode": "SOD241222S",
    "start_date": "23-Dec-2024",
    "end_date": "04-Jan-2025",
    "days": 13,
    "qty": 1,
    "location": "Sri Phala Sanur",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC27",
    "invoice_status": "Paid",
    "remark": "Sanur Bali"
  },
  {
    "tourcode": "SOO250208S",
    "start_date": "09-Feb-2025",
    "end_date": "21-Feb-2025",
    "days": 13,
    "qty": 5,
    "location": "Swastika Bungalow",
    "tl": "Ell Pratama",
    "status": "Finish",
    "modems": "MC9, MC10, MC19, MC20, MC26",
    "invoice_status": "Paid",
    "remark": "Bali & Lombok"
  },
  {
    "tourcode": "BAT250208R",
    "start_date": "09-Feb-2025",
    "end_date": "21-Feb-2025",
    "days": 13,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC25",
    "invoice_status": "Paid",
    "remark": "Sri Aksata Ubud"
  },
  {
    "tourcode": "SOJ250227S",
    "start_date": "28-Feb-2025",
    "end_date": "19-Mar-2025",
    "days": 20,
    "qty": 1,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC29",
    "invoice_status": "Paid",
    "remark": "Kirim MC29"
  },
  {
    "tourcode": "SOO250329T",
    "start_date": "30-Mar-2025",
    "end_date": "11-Apr-2025",
    "days": 13,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Nasri",
    "status": "Finish",
    "modems": "MC1, MC2",
    "invoice_status": "Paid",
    "remark": "Titip Venny, mau Mudik"
  },
  {
    "tourcode": "KIO250405B",
    "start_date": "06-Apr-2025",
    "end_date": "18-Apr-2025",
    "days": 13,
    "qty": 4,
    "location": "Sens Hotel Ubud",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC3, MC4, MC5, MC6",
    "invoice_status": "Paid",
    "remark": "Sens Hotel Ubud"
  },
  {
    "tourcode": "FIO250419",
    "start_date": "20-Apr-2025",
    "end_date": "02-May-2025",
    "days": 13,
    "qty": 4,
    "location": "B.Saya Villa Ubud",
    "tl": "Komang Merta",
    "status": "Finish",
    "modems": "MC9, MC10, MC24, MC27",
    "invoice_status": "Paid",
    "remark": "B.Saya Villa Ubud"
  },
  {
    "tourcode": "SOO250425S",
    "start_date": "26-Apr-2025",
    "end_date": "09-May-2025",
    "days": 14,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Pak Usman",
    "status": "Finish",
    "modems": "MC14",
    "invoice_status": "Paid",
    "remark": "Swastika Bungalow"
  },
  {
    "tourcode": "18048",
    "start_date": "30-Apr-2025",
    "end_date": "07-May-2025",
    "days": 8,
    "qty": 1,
    "location": "Theo - Lombok",
    "tl": "FIT",
    "status": "Finish",
    "modems": "MC4",
    "invoice_status": "Paid",
    "remark": "Miss Danielle Sullivan Zabala"
  },
  {
    "tourcode": "SOJ250501S",
    "start_date": "02-May-2025",
    "end_date": "21-May-2025",
    "days": 20,
    "qty": 2,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1, MC6",
    "invoice_status": "Paid",
    "remark": "Erian Hotel Jakarta"
  },
  {
    "tourcode": "BAJ250501",
    "start_date": "02-May-2025",
    "end_date": "21-May-2025",
    "days": 20,
    "qty": 6,
    "location": "Jambuluwuk Thamrin Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC3, MC13, MC20, MC21, MC34, MC37",
    "invoice_status": "Paid",
    "remark": "Wifi Kebawa semua"
  },
  {
    "tourcode": "AIN250509R",
    "start_date": "10-May-2025",
    "end_date": "29-May-2025",
    "days": 20,
    "qty": 1,
    "location": "Narasindo Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC36",
    "invoice_status": "Paid",
    "remark": "Rondreis Sumatra, Java en Bali"
  },
  {
    "tourcode": "BAT250510R",
    "start_date": "11-May-2025",
    "end_date": "23-May-2025",
    "days": 13,
    "qty": 3,
    "location": "Office HT Sanur",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC9, MC10, MC24",
    "invoice_status": "Paid",
    "remark": "Pty Gnut, pty Russcher, Pty Stuivenberg"
  },
  {
    "tourcode": "AIS250512",
    "start_date": "13-May-2025",
    "end_date": "01-Jun-2025",
    "days": 20,
    "qty": 2,
    "location": "Office HT Sanur",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC19, MC27",
    "invoice_status": "Paid",
    "remark": "Pty Schaap & pty Swarts"
  },
  {
    "tourcode": "SOJ250522V",
    "start_date": "23-May-2025",
    "end_date": "11-Jun-2025",
    "days": 20,
    "qty": 1,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "Mr. Marvin Christopher Graper"
  },
  {
    "tourcode": "BAI250606",
    "start_date": "07-Jun-2025",
    "end_date": "26-Jun-2025",
    "days": 20,
    "qty": 3,
    "location": "HTS Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC19, MC27, MC36",
    "invoice_status": "Paid",
    "remark": "Sumatra & Bali"
  },
  {
    "tourcode": "AIS250609R",
    "start_date": "10-Jun-2025",
    "end_date": "29-Jun-2025",
    "days": 20,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC7",
    "invoice_status": "Paid",
    "remark": "Sunda Eilanden"
  },
  {
    "tourcode": "AIL250612",
    "start_date": "13-Jun-2025",
    "end_date": "02-Jul-2025",
    "days": 20,
    "qty": 3,
    "location": "Swiss-Belinn Wahid Hasyim Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC9, MC10, MC24",
    "invoice_status": "Paid",
    "remark": "Wahid Hasyim Jakarta"
  },
  {
    "tourcode": "SOD250621S",
    "start_date": "22-Jun-2025",
    "end_date": "04-Jul-2025",
    "days": 12,
    "qty": 1,
    "location": "Sri Phala Sanur",
    "tl": "Yoga",
    "status": "Finish",
    "modems": "MC11",
    "invoice_status": "Paid",
    "remark": "Sanur Bali"
  },
  {
    "tourcode": "KIB250705B",
    "start_date": "06-Jul-2025",
    "end_date": "18-Jul-2025",
    "days": 12,
    "qty": 4,
    "location": "SenS Hotel & Spa Ubud",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC2, MC4, MC6, MC8",
    "invoice_status": "Paid",
    "remark": "Pty De Praeter, Pty De Brackeleer, Pty Sperling, Van seters"
  },
  {
    "tourcode": "BAT250705R",
    "start_date": "06-Jul-2025",
    "end_date": "18-Jul-2025",
    "days": 12,
    "qty": 3,
    "location": "Bakung Hotel Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC9, MC10, MC11",
    "invoice_status": "Paid",
    "remark": "Pty De Jaegere, Pty Vangrieken, Pty Motte"
  },
  {
    "tourcode": "BAI250708R",
    "start_date": "09-Jul-2025",
    "end_date": "28-Jul-2025",
    "days": 19,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nazarius Ophan",
    "status": "Finish",
    "modems": "MC1, MC3",
    "invoice_status": "Paid",
    "remark": "Pty Henkens, Pty Ceulemans"
  },
  {
    "tourcode": "FIS250708B",
    "start_date": "09-Jul-2025",
    "end_date": "28-Jul-2025",
    "days": 19,
    "qty": 3,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC13, MC20, MC21",
    "invoice_status": "Paid",
    "remark": "Pty Smits, Pty Kevin, Pty Carin"
  },
  {
    "tourcode": "BAJ250710R",
    "start_date": "11-Jul-2025",
    "end_date": "30-Jul-2025",
    "days": 19,
    "qty": 2,
    "location": "Swiss-Belinn Wahid Hasyim Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC16, MC24",
    "invoice_status": "Paid",
    "remark": "Mr. Calloens, Ms. Ceuppens"
  },
  {
    "tourcode": "FID250710",
    "start_date": "11-Jul-2025",
    "end_date": "30-Jul-2025",
    "days": 19,
    "qty": 2,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "MC33, MC34",
    "invoice_status": "Paid",
    "remark": "pty Bos, Pty Verhelst"
  },
  {
    "tourcode": "FIB250712C",
    "start_date": "13-Jul-2025",
    "end_date": "25-Jul-2025",
    "days": 12,
    "qty": 4,
    "location": "Bhuwana Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC35, MC37, MC40, MC41",
    "invoice_status": "Paid",
    "remark": "Pty Game, Pty Hendriks, Pty Maulany, Pty Steringa"
  },
  {
    "tourcode": "FIO250712P",
    "start_date": "13-Jul-2025",
    "end_date": "25-Jul-2025",
    "days": 12,
    "qty": 1,
    "location": "Sens Hotel Ubud",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC42",
    "invoice_status": "Paid",
    "remark": "Van Vlastuin Pty"
  },
  {
    "tourcode": "KIS250715P",
    "start_date": "16-Jul-2025",
    "end_date": "04-Aug-2025",
    "days": 19,
    "qty": 1,
    "location": "Le Polonia Hotel Medan",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC36",
    "invoice_status": "Paid",
    "remark": "Pty Denecker"
  },
  {
    "tourcode": "FID250717B",
    "start_date": "18-Jul-2025",
    "end_date": "04-Aug-2025",
    "days": 17,
    "qty": 2,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Halim Karnadi",
    "status": "Finish",
    "modems": "MC5, MC12",
    "invoice_status": "Paid",
    "remark": "Pty Hoogeveen, Pty Broersen"
  },
  {
    "tourcode": "BAT250718",
    "start_date": "19-Jul-2025",
    "end_date": "01-Aug-2025",
    "days": 13,
    "qty": 4,
    "location": "Puri Ayu Cottage Ubud",
    "tl": "Ketut Sentosa",
    "status": "Finish",
    "modems": "MC7, MC8, MC14, MC15",
    "invoice_status": "Paid",
    "remark": "Pty Steyaert, Pty Van Reempts, Pty Dubkova, Ms. Veltman"
  },
  {
    "tourcode": "FIO250718B",
    "start_date": "19-Jul-2025",
    "end_date": "01-Aug-2025",
    "days": 13,
    "qty": 3,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC9, MC10, MC11",
    "invoice_status": "Paid",
    "remark": "Ubud Bali"
  },
  {
    "tourcode": "AIN250722R",
    "start_date": "23-Jul-2025",
    "end_date": "11-Aug-2025",
    "days": 19,
    "qty": 4,
    "location": "Le Polonia Hotel Medan",
    "tl": "Linda Samosir",
    "status": "Finish",
    "modems": "MC14, MC18, MC23, MC26",
    "invoice_status": "Paid",
    "remark": "Pty Mont, Pty De Vries, Pty De Kam, Pty Noe"
  },
  {
    "tourcode": "AIL250724R",
    "start_date": "25-Jul-2025",
    "end_date": "13-Aug-2025",
    "days": 19,
    "qty": 1,
    "location": "Swiss Belinn Wahid Hasyim Jakarta",
    "tl": "Ell Pratama",
    "status": "Finish",
    "modems": "MC2",
    "invoice_status": "Paid",
    "remark": "Pty Lievrouw"
  },
  {
    "tourcode": "FIB250725P",
    "start_date": "26-Jul-2025",
    "end_date": "08-Aug-2025",
    "days": 13,
    "qty": 2,
    "location": "Putri Ayu Cottage Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC40, MC41",
    "invoice_status": "Paid",
    "remark": "Pty Van Wijngen, Pty Jagers"
  },
  {
    "tourcode": "SOK250725S",
    "start_date": "26-Jul-2025",
    "end_date": "08-Aug-2025",
    "days": 13,
    "qty": 4,
    "location": "Sri Aksata Ubud",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC28, MC29, MC30, MC31",
    "invoice_status": "Paid",
    "remark": "Mr. Walbeek, Ms. Braber, Ms. Heilen, Ms. Verduin"
  },
  {
    "tourcode": "AIS250728",
    "start_date": "29-Jul-2025",
    "end_date": "17-Aug-2025",
    "days": 19,
    "qty": 2,
    "location": "Ari Putri Hotel Sanur",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC15, MC16",
    "invoice_status": "Paid",
    "remark": "Mr. Zegers, Mr. De Blouwe"
  },
  {
    "tourcode": "FIS250729P",
    "start_date": "30-Jul-2025",
    "end_date": "18-Aug-2025",
    "days": 19,
    "qty": 4,
    "location": "Le Polonia Hotel Medan",
    "tl": "Sofyan Manik",
    "status": "Finish",
    "modems": "MC6, MC8, MC17, MC18",
    "invoice_status": "Paid",
    "remark": "Pty Kras, Pty Van Der Gaag, Pty Van Leeuwen"
  },
  {
    "tourcode": "SOJ250731S",
    "start_date": "01-Aug-2025",
    "end_date": "20-Aug-2025",
    "days": 19,
    "qty": 5,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC3, MC4, MC13, MC16, MC20",
    "invoice_status": "Paid",
    "remark": "Pax De Brij, pax Masselink, pax Ruijgrok, pax Couprie"
  },
  {
    "tourcode": "FID250731P",
    "start_date": "01-Aug-2025",
    "end_date": "20-Aug-2025",
    "days": 19,
    "qty": 1,
    "location": "de Braga by ARTOTEL Bandung",
    "tl": "Sugiarto",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "Pty Meis"
  },
  {
    "tourcode": "BAI250805",
    "start_date": "06-Aug-2025",
    "end_date": "25-Aug-2025",
    "days": 19,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC19, MC27",
    "invoice_status": "Paid",
    "remark": "Pty De Jong, Pty Hormann"
  },
  {
    "tourcode": "KIS250805B",
    "start_date": "06-Aug-2025",
    "end_date": "25-Aug-2025",
    "days": 19,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC22, MC25",
    "invoice_status": "Paid",
    "remark": "Sumatra & Bali"
  },
  {
    "tourcode": "AIL250807",
    "start_date": "08-Aug-2025",
    "end_date": "27-Aug-2025",
    "days": 19,
    "qty": 1,
    "location": "Swiss Belinn Wahid Hasyim Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC36",
    "invoice_status": "Paid",
    "remark": "Koers"
  },
  {
    "tourcode": "SOO250816T",
    "start_date": "17-Aug-2025",
    "end_date": "29-Aug-2025",
    "days": 12,
    "qty": 2,
    "location": "Bumas Hotel Sanur",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC29, MC30",
    "invoice_status": "Paid",
    "remark": "Ms. de Vlieger, Mr Kwaaitaal"
  },
  {
    "tourcode": "AIL250904R",
    "start_date": "05-Sep-2025",
    "end_date": "24-Sep-2025",
    "days": 19,
    "qty": 3,
    "location": "Erian Hotel Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC17, MC18, MC19",
    "invoice_status": "Paid",
    "remark": "Pty Kops, Pty Pauwels, Pty Baijens"
  },
  {
    "tourcode": "SOJ250904V",
    "start_date": "05-Sep-2025",
    "end_date": "24-Sep-2025",
    "days": 19,
    "qty": 7,
    "location": "Erian Hotel Jakarta",
    "tl": "Ophan",
    "status": "Finish",
    "modems": "MC23, MC24, MC25, MC26, MC28, MC29, MC30",
    "invoice_status": "Paid",
    "remark": "Java, Bali en Gili eilanden"
  },
  {
    "tourcode": "SOK250906T",
    "start_date": "07-Sep-2025",
    "end_date": "19-Sep-2025",
    "days": 12,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC2, MC3",
    "invoice_status": "Paid",
    "remark": "Clary, Mark"
  },
  {
    "tourcode": "AIT250906R",
    "start_date": "07-Sep-2025",
    "end_date": "19-Sep-2025",
    "days": 12,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC1",
    "invoice_status": "Paid",
    "remark": "Kim"
  },
  {
    "tourcode": "AIS250915R",
    "start_date": "16-Sep-2025",
    "end_date": "05-Oct-2025",
    "days": 19,
    "qty": 1,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC33",
    "invoice_status": "Paid",
    "remark": "Mr. Marinus"
  },
  {
    "tourcode": "AIN250919R",
    "start_date": "20-Sep-2025",
    "end_date": "09-Oct-2025",
    "days": 19,
    "qty": 4,
    "location": "Le Polonia Hotel Medan",
    "tl": "Chairul Effendi",
    "status": "Finish",
    "modems": "MC34, MC35, MC36, MC37",
    "invoice_status": "Paid",
    "remark": "Ms. Gruter, Mr. Vahl, Mr. Breukink, Ms. Van Der Zeeuw"
  },
  {
    "tourcode": "SOO250927T",
    "start_date": "28-Sep-2025",
    "end_date": "10-Oct-2025",
    "days": 12,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Usman",
    "status": "Finish",
    "modems": "MC29, MC30",
    "invoice_status": "Paid",
    "remark": "Ms. Blom & Mr. Rüsse"
  },
  {
    "tourcode": "SOJ251002T",
    "start_date": "03-Oct-2025",
    "end_date": "22-Oct-2025",
    "days": 19,
    "qty": 6,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4, MC5, MC6",
    "invoice_status": "Paid",
    "remark": "Ms. Boorsma, Ms. Wiegers, Mr. Mulder, Ms. Bouts, Ms. Vergoossen, Ms. Beijaard"
  },
  {
    "tourcode": "BAJ251002",
    "start_date": "03-Oct-2025",
    "end_date": "22-Oct-2025",
    "days": 19,
    "qty": 4,
    "location": "Jambuluwuk Thamrin Jakarta",
    "tl": "Eddy B",
    "status": "Finish",
    "modems": "MC7, MC8, MC9, MC10",
    "invoice_status": "Paid",
    "remark": "Mr. Duijs, Mr. Hack, Ms. Herrewyn, Ms. Molegraaf"
  },
  {
    "tourcode": "AIS251006",
    "start_date": "07-Oct-2025",
    "end_date": "26-Oct-2025",
    "days": 19,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC11, MC12",
    "invoice_status": "Paid",
    "remark": "Ms. Van Beek, Mr. Bakx"
  },
  {
    "tourcode": "BAT251011R",
    "start_date": "12-Oct-2025",
    "end_date": "24-Oct-2025",
    "days": 12,
    "qty": 3,
    "location": "Sri Aksata Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC13, MC14, MC15",
    "invoice_status": "Paid",
    "remark": "Ms. Weijer, Mr. Nuijs & Ms. Marlies"
  },
  {
    "tourcode": "SOK251011S",
    "start_date": "12-Oct-2025",
    "end_date": "24-Oct-2025",
    "days": 12,
    "qty": 1,
    "location": "Sri Aksata Ubud",
    "tl": "Jielly",
    "status": "Finish",
    "modems": "MC16",
    "invoice_status": "Paid",
    "remark": "Ms. Van Til"
  },
  {
    "tourcode": "SOD251011V",
    "start_date": "12-Oct-2025",
    "end_date": "24-Oct-2025",
    "days": 12,
    "qty": 3,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC17, MC18, MC19",
    "invoice_status": "Paid",
    "remark": "Mr. Wiegerinck, Ms. De Haan, Mr. Ooms"
  },
  {
    "tourcode": "AIN251017R",
    "start_date": "18-Oct-2025",
    "end_date": "06-Nov-2025",
    "days": 19,
    "qty": 2,
    "location": "Le Polonia Hotel Medan",
    "tl": "Nurdin Nasution",
    "status": "Finish",
    "modems": "MC20, MC21",
    "invoice_status": "Paid",
    "remark": "Sumatra & Bali Tour"
  },
  {
    "tourcode": "SOJ251030S",
    "start_date": "31-Oct-2025",
    "end_date": "19-Nov-2025",
    "days": 19,
    "qty": 2,
    "location": "Erian Hotel Jakarta",
    "tl": "Empong Kuswoyo",
    "status": "Finish",
    "modems": "MC22, MC23",
    "invoice_status": "Paid",
    "remark": "Mr John de Wit, van Bergen"
  },
  {
    "tourcode": "SOO251101S",
    "start_date": "02-Nov-2025",
    "end_date": "14-Nov-2025",
    "days": 12,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Pendot",
    "status": "Finish",
    "modems": "MC24, MC25, MC26, MC27",
    "invoice_status": "Paid",
    "remark": "Ms. Spanjer, Ms. van Santen, Mr.ten Broek, Mr. van den Oord"
  },
  {
    "tourcode": "SOD251101T",
    "start_date": "02-Nov-2025",
    "end_date": "14-Nov-2025",
    "days": 12,
    "qty": 7,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC28, MC29, MC30, MC31, MC32, MC33, MC34",
    "invoice_status": "Paid",
    "remark": "Stella, Carla, Sandra, Nicole, koen, Leo, Huub"
  },
  {
    "tourcode": "SOD251206V",
    "start_date": "07-Dec-2025",
    "end_date": "19-Dec-2025",
    "days": 12,
    "qty": 1,
    "location": "Sri Phala Seminyak",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC33",
    "invoice_status": "Paid",
    "remark": "Ms. Mandy Luby"
  },
  {
    "tourcode": "KIO251220C",
    "start_date": "21-Dec-2025",
    "end_date": "02-Jan-2026",
    "days": 12,
    "qty": 2,
    "location": "Sens Hotel Ubud",
    "tl": "Gede Suadnyana",
    "status": "Finish",
    "modems": "MC34, MC35",
    "invoice_status": "Paid",
    "remark": "Mr. Jan Pieter de Graff"
  },
  {
    "tourcode": "KIB260404",
    "start_date": "05-Apr-2026",
    "end_date": "17-Apr-2026",
    "days": 12,
    "qty": 2,
    "location": "Sri Aksata Ubud",
    "tl": "Komang Sudira",
    "status": "Finish",
    "modems": "MC34, MC35",
    "invoice_status": "Paid",
    "remark": "Mr. Wim de Spae, Miss. Inge Huysmans"
  },
  {
    "tourcode": "FIO260418",
    "start_date": "18-Apr-2026",
    "end_date": "01-May-2026",
    "days": 13,
    "qty": 4,
    "location": "B.Saya Villa Ubud",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC17, MC36, MC39, MC41",
    "invoice_status": "Paid",
    "remark": "Mr. Edwin Sleicher, Ms. Vanessa Wissink, Mr. Sebastiaan Deijkers, Mr. Eelko Vooijs"
  },
  {
    "tourcode": "SOO260425",
    "start_date": "26-Apr-2026",
    "end_date": "09-May-2026",
    "days": 13,
    "qty": 4,
    "location": "Swastika Bungalow",
    "tl": "Jielly",
    "status": "Finish",
    "modems": "MC1, MC2, MC3, MC4",
    "invoice_status": "Paid",
    "remark": "Miss Brigitta Christina, Miss Cynthia, Mr Jan Johannes, Mr Ruben Tacoma"
  },
  {
    "tourcode": "BAS260511",
    "start_date": "12-May-2026",
    "end_date": "31-May-2026",
    "days": 19,
    "qty": 2,
    "location": "Swastika Bungalow",
    "tl": "Komang Karung",
    "status": "Finish",
    "modems": "MC17, MC36",
    "invoice_status": "Paid",
    "remark": "Miss Jacqueline Mariëlle t Hardt, Miss Ingrid Alexandra Maria Metternich"
  },
  {
    "tourcode": "BAJ260521",
    "start_date": "22-May-2026",
    "end_date": "10-Jun-2026",
    "days": 19,
    "qty": 2,
    "location": "Santika Premiere Hayam Wuruk Jakarta",
    "tl": "Bram Idrus",
    "status": "Finish",
    "modems": "MC37, MC39",
    "invoice_status": "Paid",
    "remark": "Jakarta & Bali Tour"
  },
  {
    "tourcode": "SOJ260521",
    "start_date": "22-May-2026",
    "end_date": "10-Jun-2026",
    "days": 19,
    "qty": 1,
    "location": "Santika Premiere Hayam Wuruk Jakarta",
    "tl": "Pieter",
    "status": "Finish",
    "modems": "MC40",
    "invoice_status": "Paid",
    "remark": "Jakarta Tour"
  },
  {
    "tourcode": "SOD260708",
    "start_date": "09-Jul-2026",
    "end_date": "21-Jul-2026",
    "days": 12,
    "qty": 3,
    "location": "Sri Phala Sanur",
    "tl": "Komang Sudira",
    "status": "Running",
    "modems": "MC1, MC2, MC4",
    "invoice_status": "Paid",
    "remark": "Miss Julia Aimée De la Haije, Miss Kimberley van der Graaf, Miss Irma Van Vegchel",
    "device_pax": {
      "MC1": "Miss Julia Aimée De la Haije",
      "MC2": "Miss Kimberley van der Graaf",
      "MC4": "Miss Irma Van Vegchel"
    }
  },
  {
    "tourcode": "KIB260708",
    "start_date": "09-Jul-2026",
    "end_date": "21-Jul-2026",
    "days": 12,
    "qty": 2,
    "location": "Ubud, Pertiwi Bisma",
    "tl": "Nino Sumendap",
    "status": "Finish",
    "modems": "MC5, MC6",
    "invoice_status": "Paid",
    "remark": "Mr Gijs Barend Rudolphus Vloon, Miss Marjolein Denise T Van Acker"
  },
  {
    "tourcode": "KIS260710",
    "start_date": "13-Jul-2026",
    "end_date": "30-Jul-2026",
    "days": 18,
    "qty": 2,
    "location": "Medan, Polonia Hotel",
    "tl": "Nurdin Nasution",
    "status": "Running",
    "modems": "MC41, eSIM",
    "invoice_status": "Paid",
    "remark": "Mr Kristof Van den Broeck, Mr Jos Antoine Verbakel",
    "device_pax": {
      "MC41": "Mr Kristof Van den Broeck",
      "eSIM": "Mr Jos Antoine Verbakel"
    }
  },
  {
    "tourcode": "FIO260715",
    "start_date": "16-Jul-2026",
    "end_date": "28-Jul-2026",
    "days": 13,
    "qty": 1,
    "location": "Ubud, B.Saya Villa",
    "tl": "I Ketut Sentosa",
    "status": "Running",
    "modems": "MC39",
    "invoice_status": "Paid",
    "remark": "Mr Farley Robin Letsch",
    "device_pax": {
      "MC39": "Mr Farley Robin Letsch"
    }
  },
  {
    "tourcode": "AIL260716",
    "start_date": "17-Jul-2026",
    "end_date": "05-Aug-2026",
    "days": 20,
    "qty": 1,
    "location": "Jakarta, Santika Hayam Wuruk",
    "tl": "Bram Idrus",
    "status": "Running",
    "modems": "MC3",
    "invoice_status": "Paid",
    "remark": "Miss Esmee Dohmen",
    "device_pax": {
      "MC3": "Miss Esmee Dohmen"
    }
  },
  {
    "tourcode": "FIS260717",
    "start_date": "18-Jul-2026",
    "end_date": "06-Aug-2026",
    "days": 20,
    "qty": 1,
    "location": "HT Sumatra Office",
    "tl": "Linda Samosir",
    "status": "Running",
    "modems": "MC36",
    "invoice_status": "Paid",
    "remark": "Mr Gerrit Johannes Kuijvenhoven",
    "device_pax": {
      "MC36": "Mr Gerrit Johannes Kuijvenhoven"
    }
  },
  {
    "tourcode": "KIB260722",
    "start_date": "23-Jul-2026",
    "end_date": "04-Aug-2026",
    "days": 13,
    "qty": 3,
    "location": "Ubud, Sri Aksata",
    "tl": "Gede Suadnyana",
    "status": "Running",
    "modems": "MC7, MC8, MC12",
    "invoice_status": "Paid",
    "remark": "Miss Kimberley Winifreda D van Megroot, Mr Aalbertus Jørgen Wagensveld",
    "device_pax": {
      "MC7": "Miss Kimberley Winifreda",
      "MC8": "Mr Aalbertus Jørgen Wagensveld",
      "MC12": "Family Guest"
    }
  },
  {
    "tourcode": "SOD260722",
    "start_date": "23-Jul-2026",
    "end_date": "04-Aug-2026",
    "days": 13,
    "qty": 2,
    "location": "Sanur, Abian Harmony",
    "tl": "Komang Sudira",
    "status": "Running",
    "modems": "MC10, MC11",
    "invoice_status": "Paid",
    "remark": "Sanur Abian Harmony"
  },
  {
    "tourcode": "BAJ260723",
    "start_date": "24-Jul-2026",
    "end_date": "12-Aug-2026",
    "days": 20,
    "qty": 1,
    "location": "Jakarta, Jambuluwuk Thamrin",
    "tl": "Sugiarto",
    "status": "Running",
    "modems": "MC33",
    "invoice_status": "Paid",
    "remark": "Miss Kristel Van Strydonck",
    "device_pax": {
      "MC33": "Miss Kristel Van Strydonck"
    }
  },
  {
    "tourcode": "BAI260723",
    "start_date": "24-Jul-2026",
    "end_date": "12-Aug-2026",
    "days": 20,
    "qty": 1,
    "location": "HT Sumatra Office",
    "tl": "Halim Karnadi",
    "status": "Running",
    "modems": "MC13",
    "invoice_status": "Paid",
    "remark": "Miss Monica Caroline W. Sykora",
    "device_pax": {
      "MC13": "Miss Monica Caroline W. Sykora"
    }
  },
  {
    "tourcode": "SOJ260723",
    "start_date": "24-Jul-2026",
    "end_date": "12-Aug-2026",
    "days": 20,
    "qty": 4,
    "location": "Santika Premiere Hayam Wuruk, Jakarta",
    "tl": "Ophan",
    "status": "Running",
    "modems": "MC30, MC35, MC37, MC40",
    "invoice_status": "Paid",
    "remark": "Miss Margaretha, Mr Maximiliaan, Miss Janneke, Mr Ludovicus",
    "device_pax": {
      "MC30": "Miss Margaretha",
      "MC35": "Mr Maximiliaan",
      "MC37": "Miss Janneke",
      "MC40": "Mr Ludovicus"
    }
  },
  {
    "tourcode": "FID260730",
    "start_date": "31-Jul-2026",
    "end_date": "19-Aug-2026",
    "days": 20,
    "qty": 2,
    "location": "Bandung, de Braga",
    "tl": "Sofyan Manik",
    "status": "Upcoming",
    "modems": "MC19, MC21",
    "invoice_status": "Pending",
    "remark": "Mr Nicky Stephanus Brouwer, Miss Anne Maria Zandstra",
    "device_pax": {
      "MC19": "Mr Nicky Stephanus Brouwer",
      "MC21": "Miss Anne Maria Zandstra"
    }
  },
  {
    "tourcode": "BAS260727",
    "start_date": "28-Jul-2026",
    "end_date": "16-Aug-2026",
    "days": 20,
    "qty": 3,
    "location": "Sanur, Abian Harmony",
    "tl": "Komang Karung",
    "status": "Upcoming",
    "modems": "MC14, MC15, MC16",
    "invoice_status": "Pending",
    "remark": "Mr Petrus Christianus, Mr Antonius Johannes, Miss Leontine Cornelia"
  },
  {
    "tourcode": "SOO260729",
    "start_date": "30-Jul-2026",
    "end_date": "11-Aug-2026",
    "days": 13,
    "qty": 7,
    "location": "Sanur, Abian Harmony",
    "tl": "Subhan Saputra",
    "status": "Upcoming",
    "modems": "MC20, MC22, MC23, MC24, MC25, MC26, MC27",
    "invoice_status": "Pending",
    "remark": "Miss Jolijn Tooten, Miss Nikki Hanna, Mr Martin Jozef, Mr Jesse Marijn, Miss Kirsten Janine, Mr Mario, Mr Jordi"
  },
  {
    "tourcode": "FIO260729",
    "start_date": "30-Jul-2026",
    "end_date": "11-Aug-2026",
    "days": 13,
    "qty": 2,
    "location": "Ubud B Saya Villa",
    "tl": "Nino Sumendap",
    "status": "Upcoming",
    "modems": "MC28, MC29",
    "invoice_status": "Pending",
    "remark": "Miss Elsbeth Femke de Vries, Mr Maico Marinus Petrus Gijsbertus Meyer"
  },
  {
    "tourcode": "SOJ260730",
    "start_date": "31-Jul-2026",
    "end_date": "19-Aug-2026",
    "days": 20,
    "qty": 1,
    "location": "Jakarta, Santika Premiere Hayam Wuruk",
    "tl": "Empong Kuswoyo",
    "status": "Upcoming",
    "modems": "MC32",
    "invoice_status": "Pending",
    "remark": "Miss Annelies Van Geert",
    "device_pax": {
      "MC32": "Miss Annelies Van Geert"
    }
  }
];

export default function ModemWifiPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"inventory" | "tours">("tours");

  const [modems, setModems] = useState<ModemItem[]>([]);
  const [tourLogs, setTourLogs] = useState<TourRentalLog[]>([]);
  const [tourLeaders, setTourLeaders] = useState<TourLeader[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [tourStatusFilter, setTourStatusFilter] = useState<string>("All");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("All");
  const [dateSortOrder, setDateSortOrder] = useState<"newest" | "oldest">("newest");

  type ModemSortField = "ssid" | "device_name" | "number" | "status";
  const [modemSortField, setModemSortField] = useState<ModemSortField>("ssid");
  const [modemSortOrder, setModemSortOrder] = useState<"asc" | "desc">("asc");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTourDetail, setSelectedTourDetail] = useState<TourRentalLog | null>(null);

  // Return Checklist Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [pendingReturnTourCode, setPendingReturnTourCode] = useState<string | null>(null);
  const [returnChecklist, setReturnChecklist] = useState({
    modemDevice: true,
    usbCable: true,
    pouchBag: true,
    simCardIntact: true,
    notes: "",
  });

  const [editingModem, setEditingModem] = useState<ModemItem | null>(null);
  const [editingTourCode, setEditingTourCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const ts = Date.now();
      const [modemsRes, toursRes, leadersRes] = await Promise.all([
        fetch(`/api/modems?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-rentals?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-leaders?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
      ]);

      let fetchedModems: ModemItem[] = [];
      let fetchedTours: TourRentalLog[] = [];

      if (modemsRes.ok) {
        const mData = await modemsRes.json();
        if (Array.isArray(mData)) fetchedModems = mData;
      }
      if (toursRes.ok) {
        const tData = await toursRes.json();
        if (Array.isArray(tData)) fetchedTours = tData;
      }
      if (leadersRes.ok) {
        const lData = await leadersRes.json();
        if (Array.isArray(lData)) setTourLeaders(lData);
      }

      setTourLogs((prev) => {
        const combined = [...fetchedTours];
        for (const p of prev) {
          if (p.tourcode && !combined.some((t) => t.tourcode === p.tourcode)) {
            combined.unshift(p);
          }
        }
        return combined;
      });

      // Reconcile modem status based on active tours (Running or Upcoming)
      const activeTours = fetchedTours.filter((t) => t.status === "Running" || t.status === "Upcoming");
      const updatesToSync: Array<{ id: string; status: ModemItem["status"]; remark?: string | null }> = [];

      const reconciledModems = fetchedModems.map((m) => {
        if (m.status === "Maintenance") return m;
        const mcCode = m.ssid.replace("Media Creative ", "MC");
        const activeTour = activeTours.find((t) => {
          const assignedList = t.modems.split(",").map((s) => s.trim());
          return assignedList.includes(mcCode) || assignedList.includes(m.ssid);
        });

        const expectedStatus: ModemItem["status"] = activeTour ? "Rented" : "Available";
        const expectedRemark = activeTour ? `${activeTour.tourcode} (TL: ${activeTour.tl})` : null;

        const isRemarkFromFinishedTour = !activeTour && m.remark && !m.remark.toLowerCase().includes("no bat") && !m.remark.toLowerCase().includes("kartu mati") && !m.remark.toLowerCase().includes("my telkomsel");

        if (m.status !== expectedStatus || (isRemarkFromFinishedTour && m.remark !== null)) {
          const newRemark = expectedRemark !== null ? expectedRemark : (isRemarkFromFinishedTour ? null : m.remark);
          updatesToSync.push({ id: m.id, status: expectedStatus, remark: newRemark });
          return { ...m, status: expectedStatus, remark: newRemark || undefined };
        }
        return m;
      });

      setModems(reconciledModems);

      // Asynchronously push reconciled statuses to API
      if (updatesToSync.length > 0) {
        Promise.all(
          updatesToSync.map((u) =>
            fetch("/api/modems", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(u),
            })
          )
        ).catch((e) => console.error("Error syncing reconciled modem status:", e));
      }
    } catch (err) {
      console.error("Failed to load rental data from API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadData, { tables: ["modems", "tour_rental_logs", "tour_leaders"] });

  // 1-CLICK WHATSAPP DISPATCHER
  function handleWhatsAppShare(tour: TourRentalLog) {
    const assignedList = tour.modems.split(",").map((s) => s.trim()).filter(Boolean);

    // Build modem wifi details text
    const modemDetails = assignedList
      .map((mcCode) => {
        const match = modems.find(
          (m) => m.ssid.replace("Media Creative ", "MC") === mcCode || m.ssid === mcCode
        );
        const paxName = tour.device_pax?.[mcCode] || "Guest";
        if (match) {
          return `📱 *${match.ssid}* (${match.device_name})\n🔑 Pass: \`${match.password}\`\n📞 SIM: ${match.number}\n👤 Pax: ${paxName}`;
        }
        return `📱 *Modem ${mcCode}*\n👤 Pax: ${paxName}`;
      })
      .join("\n\n");

    const message = `*MEDIA CREATIVE - TOUR MODEM RENTAL DETAILS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ *Tourcode:* ${tour.tourcode}\n` +
      `👤 *Tour Leader:* ${tour.tl}\n` +
      `📅 *Period:* ${tour.start_date} s/d ${tour.end_date} (${tour.days} Days)\n` +
      `📍 *Location:* ${tour.location}\n` +
      `📦 *Qty Modems:* ${tour.qty} Unit(s)\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*DATA MODEM WIFI:*\n${modemDetails || "Modem belum ditugaskan"}\n\n` +
      `*Catatan:* Harap pastikan modem & charger selalu dijaga selama tour berlangsung. Terima kasih! 🙏`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    toast.success("WhatsApp Dispatcher", `Order detail for ${tour.tourcode} ready to send via WhatsApp`);
  }

  // EXPORT CSV UTILITY
  function handleExportModems() {
    exportToCSV("modem_inventory_export", modems, [
      { key: "ssid", label: "SSID / Name" },
      { key: "device_name", label: "Device Name" },
      { key: "number", label: "SIM Number" },
      { key: "password", label: "Password" },
      { key: "status", label: "Status" },
      { key: "remark", label: "Remark" },
    ]);
    toast.info("Exporting Modems", "CSV download started");
  }

  function handleExportTours() {
    exportToCSV("tour_rental_logs_export", tourLogs, [
      { key: "tourcode", label: "Tour Code" },
      { key: "tl", label: "Tour Leader" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "days", label: "Days" },
      { key: "qty", label: "Qty Modems" },
      { key: "modems", label: "Assigned Modems" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "invoice_status", label: "Invoice Status" },
      { key: "remark", label: "Pax / Remark" },
    ]);
    toast.info("Exporting Tour Logs", "CSV download started");
  }

  // Date converter helper for <input type="date" />
  function formatDateForInput(dateStr?: string): string {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const timestamp = parseTourDate(dateStr);
    if (timestamp > 0) {
      const d = new Date(timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return new Date().toISOString().split("T")[0];
  }

  // Form State: Add/Edit Modem Device
  const [form, setForm] = useState({
    device_name: "",
    number: "",
    ssid: "",
    password: "",
    status: "Available" as ModemItem["status"],
    remark: "",
  });

  // Form State: New Tour / Rental Order
  const [tourForm, setTourForm] = useState({
    tourcode: "",
    start_date: "",
    end_date: "",
    location: "",
    tl: "",
    status: "Upcoming" as TourRentalLog["status"],
    invoice_status: "Pending" as TourRentalLog["invoice_status"],
    selectedModemSsids: [] as string[],
    devicePaxMap: {} as Record<string, string>, // PER-MODEM PAX NAME MAP e.g. { "MC1": "Miss Julia" }
    remark: "",
    notes: "",
  });

  // Lookup helper: Find tour assigned to a modem
  function getAssignedTourForModem(modem: ModemItem): TourRentalLog | undefined {
    const mcCode = modem.ssid.replace("Media Creative ", "MC");
    return tourLogs.find((t) => {
      if (t.status === "Finish" || t.status === "Cancel") return false;
      const assignedList = t.modems.split(",").map((s) => s.trim());
      if (assignedList.includes(mcCode) || assignedList.includes(modem.ssid)) return true;
      if (modem.remark && modem.remark.includes(t.tourcode)) return true;
      return false;
    });
  }

  // Open Add/Edit Device
  function handleOpenAdd() {
    setEditingModem(null);
    const nextNum = modems.length + 1;
    setForm({
      device_name: `Orbitmifi_NEW`,
      number: "08123456789",
      ssid: `Media Creative ${nextNum}`,
      password: `MC${nextNum}#2026`,
      status: "Available",
      remark: "",
    });
    setShowModal(true);
  }

  function handleOpenEdit(m: ModemItem) {
    setEditingModem(m);
    setForm({
      device_name: m.device_name,
      number: m.number,
      ssid: m.ssid,
      password: m.password,
      status: m.status,
      remark: m.remark || "",
    });
    setShowModal(true);
  }

  async function handleSubmitDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!form.device_name.trim() || !form.number.trim() || !form.ssid.trim()) {
      alert("Please fill in required fields.");
      return;
    }

    const payload = {
      device_name: form.device_name.trim(),
      number: form.number.trim(),
      ssid: form.ssid.trim(),
      password: form.password.trim(),
      status: form.status,
      remark: form.remark.trim() || undefined,
    };

    try {
      if (editingModem) {
        const res = await fetch("/api/modems", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingModem.id, ...payload }),
        });
        if (res.ok) {
          setShowModal(false);
          toast.success("Modem Updated", `Device ${payload.ssid} updated successfully`);
          await loadData();
        } else {
          toast.error("Update Failed", "Could not update modem device");
        }
      } else {
        const res = await fetch("/api/modems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "modem-" + Date.now(), ...payload }),
        });
        if (res.ok) {
          setShowModal(false);
          toast.success("Modem Device Saved", `New modem ${payload.ssid} added`);
          await loadData();
        } else {
          toast.error("Save Failed", "Could not save modem device to database");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Failed to save modem device");
    }
  }

  // Open New Tour Rental Modal
  function handleOpenNewTour() {
    setEditingTourCode(null);
    setTourForm({
      tourcode: "",
      start_date: "",
      end_date: "",
      location: "",
      tl: "",
      status: "Upcoming",
      invoice_status: "Pending",
      selectedModemSsids: [],
      devicePaxMap: {},
      remark: "",
      notes: "",
    });
    setShowTourModal(true);
  }

  // Open Edit Existing Tour Modal
  function handleOpenEditTour(tour: TourRentalLog) {
    setEditingTourCode(tour.tourcode);
    const assignedCodes = tour.modems
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const paxMap: Record<string, string> = tour.device_pax ? { ...tour.device_pax } : {};
    assignedCodes.forEach((code) => {
      if (!(code in paxMap)) {
        paxMap[code] = "";
      }
    });

    setTourForm({
      tourcode: tour.tourcode,
      start_date: formatDateForInput(tour.start_date),
      end_date: formatDateForInput(tour.end_date),
      location: tour.location,
      tl: tour.tl,
      status: tour.status,
      invoice_status: tour.invoice_status,
      selectedModemSsids: assignedCodes,
      devicePaxMap: paxMap,
      remark: tour.remark || "",
      notes: tour.notes || "",
    });
    setShowTourModal(true);
  }

  function toggleModemSelectionInTour(ssidLabel: string) {
    const matchingModem = modems.find(
      (m) => m.ssid.replace("Media Creative ", "MC") === ssidLabel || m.ssid === ssidLabel
    );
    const assignedTour = matchingModem ? getAssignedTourForModem(matchingModem) : undefined;
    const isAssignedToThisTour = editingTourCode && assignedTour?.tourcode === editingTourCode;
    const isAvailable = matchingModem ? matchingModem.status !== "Maintenance" && (!assignedTour || isAssignedToThisTour) : true;
    const isCurrentlySelected = tourForm.selectedModemSsids.includes(ssidLabel);

    if (!isAvailable && !isCurrentlySelected) {
      return;
    }

    setTourForm((prev) => {
      const exists = prev.selectedModemSsids.includes(ssidLabel);
      if (exists) {
        const nextSsids = prev.selectedModemSsids.filter((s) => s !== ssidLabel);
        const nextPaxMap = { ...prev.devicePaxMap };
        delete nextPaxMap[ssidLabel];
        return {
          ...prev,
          selectedModemSsids: nextSsids,
          devicePaxMap: nextPaxMap,
        };
      } else {
        return {
          ...prev,
          selectedModemSsids: [...prev.selectedModemSsids, ssidLabel],
          devicePaxMap: { ...prev.devicePaxMap, [ssidLabel]: "" },
        };
      }
    });
  }

  async function handleSaveNewTour(e: React.FormEvent) {
    e.preventDefault();

    if (!tourForm.tourcode.trim()) {
      toast.warning("Missing Tourcode", "Silakan isi Tour Code terlebih dahulu");
      return;
    }
    if (!tourForm.tl.trim()) {
      toast.warning("Missing Tour Leader", "Silakan pilih Tour Leader (TL)");
      return;
    }

    if (tourForm.status !== "Upcoming" && tourForm.selectedModemSsids.length === 0) {
      toast.warning("Modem Selection Required", "Silakan pilih setidaknya 1 modem untuk tour Running");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const defaultEndStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })();

    const rawStart = tourForm.start_date || todayStr;
    const rawEnd = tourForm.end_date || defaultEndStr;

    const sDate = new Date(rawStart);
    const eDate = new Date(rawEnd);
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const formattedStart = formatDateDisplay(rawStart);
    const formattedEnd = formatDateDisplay(rawEnd);

    const modemLabels = tourForm.selectedModemSsids.join(", ");

    const paxList = Object.entries(tourForm.devicePaxMap)
      .filter(([_, pax]) => pax.trim().length > 0)
      .map(([mCode, pax]) => `${pax.trim()}`);
    const combinedPaxRemark = paxList.join(", ") || tourForm.remark.trim();

    const updatedTour = {
      tourcode: tourForm.tourcode.trim(),
      start_date: formattedStart,
      end_date: formattedEnd,
      days: diffDays,
      qty: tourForm.selectedModemSsids.length,
      location: tourForm.location.trim() || "Sanur, Bali",
      tl: tourForm.tl.trim(),
      status: tourForm.status,
      modems: modemLabels,
      invoice_status: tourForm.invoice_status,
      remark: combinedPaxRemark || undefined,
      notes: tourForm.notes.trim() || undefined,
      device_pax: tourForm.devicePaxMap,
    };

    try {
      const isEdit = !!editingTourCode;
      const res = await fetch("/api/tour-rentals", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTour),
      });

      if (res.ok) {
        const savedTour = await res.json();
        setShowTourModal(false);
        setEditingTourCode(null);
        setActiveTab("tours");
        setSearch("");
        setTourStatusFilter("All");
        setInvoiceStatusFilter("All");
        setDateSortOrder("newest");

        toast.success(
          isEdit ? "Tour Order Updated" : "New Tour Created",
          `Tour ${updatedTour.tourcode} (${updatedTour.tl}) saved`
        );

        if (savedTour && savedTour.tourcode) {
          setTourLogs((prev) => {
            const idx = prev.findIndex((t) => t.tourcode === savedTour.tourcode);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...savedTour };
              return updated;
            }
            return [savedTour, ...prev];
          });
        }

        await loadData();
      } else {
        toast.error("Save Failed", "Failed to save tour rental order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Error saving tour rental order");
    }
  }

  async function updateTourStatus(tourcode: string, newStatus: TourRentalLog["status"]) {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, status: newStatus }),
      });
      if (res.ok) {
        toast.success("Status Updated", `Tour ${tourcode} status changed to ${newStatus}`);

        // Automatically sync assigned modem statuses
        const targetTour = tourLogs.find((t) => t.tourcode === tourcode);
        if (targetTour) {
          const assignedCodes = targetTour.modems.split(",").map((s) => s.trim()).filter(Boolean);
          for (const mcCode of assignedCodes) {
            const matchModem = modems.find(
              (m) => m.ssid.replace("Media Creative ", "MC") === mcCode || m.ssid === mcCode
            );
            if (matchModem && matchModem.status !== "Maintenance") {
              if (newStatus === "Finish" || newStatus === "Cancel") {
                const otherActive = tourLogs.find(
                  (t) => t.tourcode !== tourcode && (t.status === "Running" || t.status === "Upcoming") && t.modems.split(",").map((s) => s.trim()).includes(mcCode)
                );
                if (!otherActive) {
                  await fetch("/api/modems", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: matchModem.id, status: "Available", remark: null }),
                  });
                }
              } else if (newStatus === "Running" || newStatus === "Upcoming") {
                await fetch("/api/modems", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: matchModem.id,
                    status: "Rented",
                    remark: `${tourcode} (TL: ${targetTour.tl})`,
                  }),
                });
              }
            }
          }
        }

        await loadData();
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTourInvoiceStatus(tourcode: string, newInvoiceStatus: TourRentalLog["invoice_status"]) {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, invoice_status: newInvoiceStatus }),
      });
      if (res.ok) {
        await loadData();
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail((prev) => (prev ? { ...prev, invoice_status: newInvoiceStatus } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTourNotes(tourcode: string, newNotes: string) {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, notes: newNotes }),
      });
      if (res.ok) {
        await loadData();
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail((prev) => (prev ? { ...prev, notes: newNotes } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function toggleTourStatus(tourcode: string) {
    const tour = tourLogs.find((t) => t.tourcode === tourcode);
    if (!tour) return;
    const nextStatus: TourRentalLog["status"] =
      tour.status === "Running" ? "Finish" : tour.status === "Upcoming" ? "Running" : "Running";
    updateTourStatus(tourcode, nextStatus);
  }

  async function handleDeleteTour(tourcode: string) {
    if (!confirm(`Are you sure you want to delete tour ${tourcode}?`)) return;
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode }),
      });
      if (res.ok) {
        setTourLogs((prev) => prev.filter((t) => t.tourcode !== tourcode));
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleDeviceStatus(id: string) {
    const item = modems.find((m) => m.id === id);
    if (!item) return;
    const nextStatus: ModemItem["status"] =
      item.status === "Available" ? "Rented" : item.status === "Rented" ? "Maintenance" : "Available";

    try {
      const res = await fetch("/api/modems", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteDevice(id: string) {
    if (!confirm("Are you sure you want to delete this Modem Wifi device?")) return;
    try {
      const res = await fetch("/api/modems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setModems((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert("Failed to delete modem device from database");
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleModemSort(field: ModemSortField) {
    if (modemSortField === field) {
      setModemSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setModemSortField(field);
      setModemSortOrder("asc");
    }
  }

  const filteredModems = modems
    .filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.device_name.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        item.ssid.toLowerCase().includes(q) ||
        item.password.toLowerCase().includes(q) ||
        (item.remark ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (modemSortField === "ssid") {
        cmp = a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" });
      } else if (modemSortField === "device_name") {
        cmp = a.device_name.localeCompare(b.device_name, undefined, { numeric: true, sensitivity: "base" });
      } else if (modemSortField === "number") {
        cmp = a.number.localeCompare(b.number);
      } else if (modemSortField === "status") {
        const statusOrder: Record<string, number> = { Available: 1, Rented: 2, Maintenance: 3 };
        cmp = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      }
      return modemSortOrder === "asc" ? cmp : -cmp;
    });

  const filteredTours = tourLogs
    .filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        t.tourcode.toLowerCase().includes(q) ||
        t.tl.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.modems.toLowerCase().includes(q) ||
        (t.remark ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q);

      const matchTourStatus = tourStatusFilter === "All" || t.status === tourStatusFilter;
      const matchInvoiceStatus = invoiceStatusFilter === "All" || t.invoice_status === invoiceStatusFilter;

      return matchSearch && matchTourStatus && matchInvoiceStatus;
    })
    .sort((a, b) => {
      const timeA = parseTourDate(a.start_date);
      const timeB = parseTourDate(b.start_date);
      return dateSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  const totalAvailable = modems.filter((m) => m.status === "Available").length;
  const totalRented = modems.filter((m) => m.status === "Rented").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Modem Wifi & Tour Rental System
            </h1>
            <span
              style={{
                background: "var(--accent-cyan-dim)",
                color: "var(--accent-cyan)",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 20,
                border: "1px solid var(--accent-cyan)",
              }}
            >
              {modems.length} Devices
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            Manage Orbit Mifi device inventory, WPA2 passwords, active tour deployments, and Tour Leader allocations.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={activeTab === "tours" ? handleExportTours : handleExportModems} title="Export CSV file">
            <Download size={15} />
            Export {activeTab === "tours" ? "Tours" : "Modems"} CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenNewTour} style={{ gap: 6 }}>
            <Plus size={16} />
            New Tour / Rental Order
          </button>
          <button className="btn btn-ghost" onClick={handleOpenAdd} style={{ gap: 6, border: "1px solid var(--border)" }}>
            <Plus size={16} />
            Add Modem Device
          </button>
        </div>
      </div>

      {/* VIEW TABS */}
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("tours")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "tours" ? "var(--accent-cyan-dim)" : "transparent",
            color: activeTab === "tours" ? "var(--accent-cyan)" : "var(--text-secondary)",
          }}
        >
          <FileText size={15} /> Tour Tracking & Deployment Logs ({tourLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "inventory" ? "var(--accent-cyan-dim)" : "transparent",
            color: activeTab === "inventory" ? "var(--accent-cyan)" : "var(--text-secondary)",
          }}
        >
          <Wifi size={15} /> Devices Inventory ({modems.length})
        </button>

        {/* MYORBIT TOP-UP SHORTCUT BUTTON */}
        <a
          href="https://www.myorbit.id/dashboard-devices"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "1px solid rgba(245,158,11,0.4)",
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
            marginLeft: "auto",
          }}
          title="Open MyOrbit Dashboard in new tab to top up modem quota"
        >
          <ExternalLink size={15} /> Top-Up Modem Quota (MyOrbit ↗)
        </a>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Total Inventory", value: `${modems.length} Modems`, color: "var(--accent-cyan)" },
          { label: "Available Stock", value: `${totalAvailable} Units`, color: "var(--accent-emerald)" },
          { label: "Currently Deployed", value: `${totalRented} Units`, color: "#3b82f6" },
          { label: "Active Tour Orders", value: `${tourLogs.filter(t => t.status === "Running" || t.status === "Upcoming").length} Groups`, color: "#f59e0b" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "16px 18px",
              borderLeft: `3px solid ${kpi.color}`,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              {kpi.label}
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER BAR */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder={
              activeTab === "inventory"
                ? "Search by Device Name, Number, SSID or Password..."
                : "Search Tourcode, Tour Leader, Hotel Location, Modems..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {activeTab === "inventory" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Available", "Rented", "Maintenance"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1px solid",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderColor: statusFilter === st ? "var(--border-accent)" : "var(--border)",
                    background: statusFilter === st ? "var(--accent-cyan-dim)" : "transparent",
                    color: statusFilter === st ? "var(--accent-cyan)" : "var(--text-secondary)",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* MODEM SORT DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Sort Modem:</span>
              <select
                className="form-input form-select"
                value={`${modemSortField}-${modemSortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [ModemSortField, "asc" | "desc"];
                  setModemSortField(field);
                  setModemSortOrder(order);
                }}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600, color: "var(--accent-cyan)" }}
              >
                <option value="ssid-asc">📶 Modem / SSID (MC1 → MC46)</option>
                <option value="ssid-desc">📶 Modem / SSID (MC46 → MC1)</option>
                <option value="device_name-asc">🏷️ Device Name (A → Z)</option>
                <option value="device_name-desc">🏷️ Device Name (Z → A)</option>
                <option value="status-asc">🟢 Status (Available → Deployed → Maint.)</option>
                <option value="status-desc">🔴 Status (Maint. → Deployed → Available)</option>
                <option value="number-asc">📞 SIM Number (Low → High)</option>
                <option value="number-desc">📞 SIM Number (High → Low)</option>
              </select>
            </div>

            {(statusFilter !== "All" || search || modemSortField !== "ssid" || modemSortOrder !== "asc") && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setModemSortField("ssid");
                  setModemSortOrder("asc");
                }}
                style={{ padding: "6px 10px", fontSize: "0.75rem", color: "#f87171" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {activeTab === "tours" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* TOUR STATUS FILTER DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Tour Status:</span>
              <select
                className="form-input form-select"
                value={tourStatusFilter}
                onChange={(e) => setTourStatusFilter(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600 }}
              >
                <option value="All">All Tour Statuses</option>
                <option value="Running">● Running (Active)</option>
                <option value="Upcoming">● Upcoming</option>
                <option value="Finish">● Finish</option>
                <option value="Cancel">● Cancel</option>
              </select>
            </div>

            {/* INVOICE STATUS FILTER DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Invoice:</span>
              <select
                className="form-input form-select"
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600 }}
              >
                <option value="All">All Invoice Statuses</option>
                <option value="Paid">✓ Paid</option>
                <option value="Pending">⏳ Pending</option>
                <option value="Unpaid">✗ Unpaid</option>
              </select>
            </div>

            {/* DATE SORT DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Sort Date:</span>
              <select
                className="form-input form-select"
                value={dateSortOrder}
                onChange={(e) => setDateSortOrder(e.target.value as "newest" | "oldest")}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600, color: "var(--accent-cyan)" }}
              >
                <option value="newest">📅 Newest Date First (Terbaru)</option>
                <option value="oldest">📅 Oldest Date First (Terlama)</option>
              </select>
            </div>

            {(tourStatusFilter !== "All" || invoiceStatusFilter !== "All" || search || dateSortOrder !== "newest") && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setTourStatusFilter("All");
                  setInvoiceStatusFilter("All");
                  setDateSortOrder("newest");
                }}
                style={{ padding: "6px 10px", fontSize: "0.75rem", color: "#f87171" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT TAB 1: DEVICES INVENTORY */}
      {activeTab === "inventory" && (
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {filteredModems.length === 0 ? (
            <EmptyState
              icon={<Wifi size={28} />}
              title={search || statusFilter !== "All" ? "No modem units match filter" : "No modem units listed"}
              description={search || statusFilter !== "All" ? "Try clearing your search term or filter status." : "Add your first Orbit Mifi unit."}
              action={
                !search && statusFilter === "All" ? (
                  <button className="btn btn-primary" onClick={handleOpenAdd}>
                    <Plus size={14} /> Add Device
                  </button>
                ) : undefined
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th
                    onClick={() => handleModemSort("device_name")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Device Name"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Device Name
                      {modemSortField === "device_name" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleModemSort("number")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by SIM Number"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      SIM Number
                      {modemSortField === "number" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleModemSort("ssid")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Modem / SSID"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Modem / SSID
                      {modemSortField === "ssid" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th>Password</th>
                  <th
                    onClick={() => handleModemSort("status")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Status"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Status
                      {modemSortField === "status" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th>Assigned Tour & Drop-off Location</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModems.map((item, idx) => {
                  const assignedTour = getAssignedTourForModem(item);
                  const isRented = item.status === "Rented" || !!assignedTour;

                  return (
                    <tr key={item.id} style={{ background: isRented ? "rgba(59,130,246,0.03)" : undefined }}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                          {item.device_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {item.number}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                          <Wifi size={13} />
                          {item.ssid}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              background: "rgba(255,255,255,0.06)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.password}
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: 4, height: "auto" }}
                            onClick={() => handleCopy(item.password, item.id)}
                            title="Copy Password"
                          >
                            {copiedId === item.id ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* STATUS BADGE WITH TOUR DETAILS LINK */}
                      <td>
                        {assignedTour ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              style={{
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: "rgba(59,130,246,0.15)",
                                color: "#3b82f6",
                                border: "1px solid rgba(59,130,246,0.3)",
                              }}
                              title="Click to view Tour Details popup"
                            >
                              <Radio size={11} /> Rented
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "var(--accent-cyan)",
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                textDecoration: "underline",
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              📌 {assignedTour.tourcode}
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => toggleDeviceStatus(item.id)}
                            style={{
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 12,
                              background:
                                item.status === "Available"
                                  ? "rgba(16,185,129,0.12)"
                                  : item.status === "Rented"
                                  ? "rgba(59,130,246,0.12)"
                                  : "rgba(245,158,11,0.12)",
                              color:
                                item.status === "Available"
                                  ? "#10b981"
                                  : item.status === "Rented"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                              border: `1px solid ${
                                item.status === "Available"
                                  ? "rgba(16,185,129,0.3)"
                                  : item.status === "Rented"
                                  ? "rgba(59,130,246,0.3)"
                                  : "rgba(245,158,11,0.3)"
                              }`,
                            }}
                            title="Click to toggle status"
                          >
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* ASSIGNED TOUR DETAILS COLUMN */}
                      <td>
                        {assignedTour ? (
                          <div
                            onClick={() => setSelectedTourDetail(assignedTour)}
                            style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                            title="Click to view Tour Details popup"
                          >
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 5 }}>
                              <MapPin size={12} style={{ color: "var(--accent-cyan)" }} />
                              {assignedTour.location}
                            </div>
                            <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                              TL: <strong style={{ color: "var(--text-primary)" }}>{assignedTour.tl}</strong> • {assignedTour.start_date} to {assignedTour.end_date}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {item.remark || "— Unassigned"}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {assignedTour && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              title="View Tour Details Popup"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Device Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleDeleteDevice(item.id)}
                            title="Delete Device"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONTENT TAB 2: TOUR TRACKING LOG */}
      {activeTab === "tours" && (
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {filteredTours.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="No tour logs match filter"
              description="Try clearing your search keyword or create a new tour rental order."
              action={
                <button className="btn btn-primary" onClick={handleOpenNewTour}>
                  <Plus size={14} /> New Tour / Rental Order
                </button>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tour Code</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setDateSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                    title="Click to sort by date"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-cyan)" }}>
                      Dates & Duration {dateSortOrder === "newest" ? "↓" : "↑"}
                    </div>
                  </th>
                  <th>Drop-off Hotel</th>
                  <th>Tour Leader (TL)</th>
                  <th>Assigned Modems</th>
                  <th>Tour Status</th>
                  <th>Invoice</th>
                  <th>Pax / Guest Remark</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTours.map((t) => (
                  <tr key={t.tourcode}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedTourDetail(t)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: 800,
                            color: "var(--accent-cyan)",
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                            textDecoration: "underline",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Click to open Tour Details popup"
                        >
                          {t.tourcode}
                          <ExternalLink size={11} />
                        </button>

                        {t.notes && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "3px",
                              borderRadius: 6,
                              background: "rgba(245, 158, 11, 0.18)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedTourDetail(t)}
                            title="Tour has notes (Click to view in Tour Details)"
                          >
                            <FileText size={12} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {t.qty > 0 ? `${t.qty} modem${t.qty > 1 ? "s" : ""}` : "No modems"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                          <Calendar size={13} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                          <span>{t.start_date} – {t.end_date}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 8,
                              background: "rgba(245,158,11,0.12)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245,158,11,0.25)",
                            }}
                          >
                            <Clock size={10} /> {t.days} Days
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.83rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={13} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                        {t.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.83rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={13} />
                        {t.tl}
                      </div>
                    </td>
                    <td>
                      {t.modems && t.modems.trim().length > 0 ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            background: "var(--accent-cyan-dim)",
                            color: "var(--text-primary)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {t.modems}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "sans-serif",
                            fontSize: "0.74rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            background: "rgba(148,163,184,0.1)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px dashed rgba(148,163,184,0.3)",
                          }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* TOUR STATUS INTERACTIVE SELECTOR */}
                    <td>
                      <select
                        className="form-select"
                        value={t.status}
                        onChange={(e) => updateTourStatus(t.tourcode, e.target.value as TourRentalLog["status"])}
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 12,
                          cursor: "pointer",
                          background:
                            t.status === "Running"
                              ? "rgba(16,185,129,0.15)"
                              : t.status === "Upcoming"
                              ? "rgba(59,130,246,0.15)"
                              : t.status === "Finish"
                              ? "rgba(148,163,184,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            t.status === "Running"
                              ? "#10b981"
                              : t.status === "Upcoming"
                              ? "#3b82f6"
                              : t.status === "Finish"
                              ? "#94a3b8"
                              : "#ef4444",
                          border: `1px solid ${
                            t.status === "Running"
                              ? "rgba(16,185,129,0.3)"
                              : t.status === "Upcoming"
                              ? "rgba(59,130,246,0.3)"
                              : t.status === "Finish"
                              ? "rgba(148,163,184,0.3)"
                              : "rgba(239,68,68,0.3)"
                          }`,
                        }}
                        title="Change tour status (Finish automatically frees modems)"
                      >
                        <option value="Running" style={{ background: "#111827", color: "#10b981" }}>● Running</option>
                        <option value="Upcoming" style={{ background: "#111827", color: "#3b82f6" }}>● Upcoming</option>
                        <option value="Finish" style={{ background: "#111827", color: "#94a3b8" }}>● Finish</option>
                        <option value="Cancel" style={{ background: "#111827", color: "#ef4444" }}>● Cancel</option>
                      </select>
                    </td>

                    {/* INVOICE PAID / UNPAID INTERACTIVE SELECTOR */}
                    <td>
                      <select
                        className="form-select"
                        value={t.invoice_status}
                        onChange={(e) => updateTourInvoiceStatus(t.tourcode, e.target.value as TourRentalLog["invoice_status"])}
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 10,
                          cursor: "pointer",
                          background:
                            t.invoice_status === "Paid"
                              ? "rgba(16,185,129,0.15)"
                              : t.invoice_status === "Pending"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            t.invoice_status === "Paid"
                              ? "#10b981"
                              : t.invoice_status === "Pending"
                              ? "#f59e0b"
                              : "#ef4444",
                          border: `1px solid ${
                            t.invoice_status === "Paid"
                              ? "rgba(16,185,129,0.3)"
                              : t.invoice_status === "Pending"
                              ? "rgba(245,158,11,0.3)"
                              : "rgba(239,68,68,0.3)"
                          }`,
                        }}
                        title="Change invoice payment status"
                      >
                        <option value="Paid" style={{ background: "#111827", color: "#10b981" }}>✓ Paid</option>
                        <option value="Pending" style={{ background: "#111827", color: "#f59e0b" }}>⏳ Pending</option>
                        <option value="Unpaid" style={{ background: "#111827", color: "#ef4444" }}>✗ Unpaid</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                        {t.remark || "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                          onClick={() => setSelectedTourDetail(t)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "#25D366" }}
                          onClick={() => handleWhatsAppShare(t)}
                          title="Send Order Info via WhatsApp"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                          onClick={() => handleOpenEditTour(t)}
                          title="Edit Tour Details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className={t.status === "Finish" ? "btn btn-ghost" : "btn btn-success"}
                          style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                          onClick={() => toggleTourStatus(t.tourcode)}
                          title="Toggle Finish"
                        >
                          <CheckCircle2 size={12} />
                          {t.status === "Finish" ? "Re-open" : "Finish"}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 8px" }}
                          onClick={() => handleDeleteTour(t.tourcode)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* POPUP MODAL: TOUR DETAILS & ASSIGNED MODEMS */}
      {selectedTourDetail && (
        <Modal
          isOpen={!!selectedTourDetail}
          onClose={() => setSelectedTourDetail(null)}
          title={`Tour Details — ${selectedTourDetail.tourcode}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* TOP SUMMARY STRIP */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--accent-cyan-dim)",
                borderRadius: 14,
                border: "1px solid var(--accent-cyan)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                  Tour Leader
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={16} style={{ color: "var(--accent-cyan)" }} />
                  {selectedTourDetail.tl}
                </div>
              </div>

              {/* INTERACTIVE STATUS SELECTOR IN POPUP */}
              <select
                className="form-select"
                value={selectedTourDetail.status}
                onChange={(e) => updateTourStatus(selectedTourDetail.tourcode, e.target.value as TourRentalLog["status"])}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 16,
                  cursor: "pointer",
                  background:
                    selectedTourDetail.status === "Running"
                      ? "rgba(16,185,129,0.2)"
                      : selectedTourDetail.status === "Upcoming"
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(148,163,184,0.2)",
                  color:
                    selectedTourDetail.status === "Running"
                      ? "#10b981"
                      : selectedTourDetail.status === "Upcoming"
                      ? "#3b82f6"
                      : "#94a3b8",
                  border: "1px solid currentColor",
                }}
              >
                <option value="Running" style={{ background: "#111827", color: "#10b981" }}>● Running</option>
                <option value="Upcoming" style={{ background: "#111827", color: "#3b82f6" }}>● Upcoming</option>
                <option value="Finish" style={{ background: "#111827", color: "#94a3b8" }}>● Finish</option>
                <option value="Cancel" style={{ background: "#111827", color: "#ef4444" }}>● Cancel</option>
              </select>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.85rem" }}>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Drop-off Location / Hotel</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} style={{ color: "var(--accent-cyan)" }} />
                  {selectedTourDetail.location}
                </div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Rental Dates & Duration</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Calendar size={14} style={{ color: "var(--accent-cyan)" }} />
                  <span>{selectedTourDetail.start_date} – {selectedTourDetail.end_date}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "rgba(245,158,11,0.12)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={11} /> {selectedTourDetail.days} Days
                  </span>
                </div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 }}>Invoice Payment Status</div>
                <select
                  className="form-select"
                  value={selectedTourDetail.invoice_status}
                  onChange={(e) => updateTourInvoiceStatus(selectedTourDetail.tourcode, e.target.value as TourRentalLog["invoice_status"])}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "var(--bg-glass-hover)",
                    color: selectedTourDetail.invoice_status === "Paid" ? "#10b981" : selectedTourDetail.invoice_status === "Pending" ? "#f59e0b" : "#ef4444",
                    border: "1px solid var(--border)",
                  }}
                >
                  <option value="Paid" style={{ background: "#111827", color: "#10b981" }}>✓ Paid</option>
                  <option value="Pending" style={{ background: "#111827", color: "#f59e0b" }}>⏳ Pending</option>
                  <option value="Unpaid" style={{ background: "#111827", color: "#ef4444" }}>✗ Unpaid</option>
                </select>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Pax / Guest Names Summary</div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                  {selectedTourDetail.remark || "— No pax remarks recorded"}
                </div>
              </div>
            </div>

            {/* FIELD NOTES SECTION IN TOUR DETAILS POPUP */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={15} />
                  <span>NOTES</span>
                </div>
                {selectedTourDetail.notes && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 6,
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    ✓ Note Active
                  </span>
                )}
              </div>
              <textarea
                className="form-input"
                rows={2}
                style={{
                  fontSize: "0.82rem",
                  padding: "8px 10px",
                  borderRadius: 8,
                  resize: "vertical",
                  background: "var(--bg-glass)",
                  borderColor: selectedTourDetail.notes ? "rgba(245, 158, 11, 0.4)" : "var(--border)",
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                }}
                placeholder="Ketik catatan khusus / field note untuk tour ini (misal: perlu tambahan charger, instruksi penyerahan modem, info lokasi)..."
                value={selectedTourDetail.notes || ""}
                onChange={(e) => updateTourNotes(selectedTourDetail.tourcode, e.target.value)}
              />
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💡 Catatan tersimpan otomatis dan akan memunculkan indikator note di daftar tour.</span>
              </div>
            </div>

            {/* ASSIGNED MODEM UNITS CARD WITH PER-MODEM PAX DISPLAY & COPY MODEM NAME BUTTON */}
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Wifi size={15} style={{ color: "var(--accent-cyan)" }} />
                Assigned Modem Units ({selectedTourDetail.qty} Units)
              </div>

              {selectedTourDetail.modems && selectedTourDetail.modems.trim().length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedTourDetail.modems.split(",").map((rawLabel) => {
                    const label = rawLabel.trim();
                    if (!label) return null;
                    const matchingModem = modems.find(
                      (m) => m.ssid.replace("Media Creative ", "MC") === label || m.ssid === label
                    );

                    // Extract per-modem pax name
                    const paxName = selectedTourDetail.device_pax ? selectedTourDetail.device_pax[label] : undefined;
                    const modemFullName = matchingModem ? `${matchingModem.device_name} (${matchingModem.ssid})` : label;
                    const deviceOnlyName = matchingModem ? matchingModem.device_name : label;
                    const nameCopyKey = `name-${label}`;

                    return (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              background: "var(--accent-cyan-dim)",
                              color: "var(--accent-cyan)",
                              padding: "3px 8px",
                              borderRadius: 6,
                              border: "1px solid var(--accent-cyan)",
                            }}
                          >
                            {label}
                          </span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {modemFullName}
                              </div>
                              {matchingModem && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(deviceOnlyName, nameCopyKey)}
                                  style={{
                                    background: "rgba(0, 212, 255, 0.08)",
                                    border: "1px solid rgba(0, 212, 255, 0.3)",
                                    color: copiedId === nameCopyKey ? "var(--accent-emerald)" : "var(--accent-cyan)",
                                    cursor: "pointer",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                  }}
                                  title={`Copy ${deviceOnlyName} to clipboard for MyOrbit app`}
                                >
                                  {copiedId === nameCopyKey ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span style={{ color: "#10b981" }}>Copied {deviceOnlyName}!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy {deviceOnlyName}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            {paxName ? (
                              <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <User size={12} /> Guest Pax: {paxName}
                              </div>
                            ) : matchingModem ? (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                SIM: {matchingModem.number}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {matchingModem && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                background: "rgba(0,0,0,0.3)",
                                color: "var(--text-primary)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                              }}
                            >
                              {matchingModem.password}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(matchingModem.password, matchingModem.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: copiedId === matchingModem.id ? "var(--accent-emerald)" : "var(--text-muted)",
                                cursor: "pointer",
                                padding: 4,
                              }}
                              title="Copy WiFi Password"
                            >
                              {copiedId === matchingModem.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px dashed rgba(245,158,11,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Info size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <span>Belum ada unit modem yang dipilih untuk tour ini. Anda dapat memilih modem kapan saja melalui "Edit Tour Details".</span>
                </div>
              )}
            </div>

            <div className="divider" style={{ margin: "4px 0" }} />

            {/* MODAL FOOTER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className={selectedTourDetail.status === "Finish" ? "btn btn-ghost" : "btn btn-success"}
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => toggleTourStatus(selectedTourDetail.tourcode)}
                >
                  <CheckCircle2 size={14} />
                  {selectedTourDetail.status === "Finish" ? "Re-open Tour" : "Mark Tour Finished (Free Modems)"}
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => handleOpenEditTour(selectedTourDetail)}
                >
                  <Edit2 size={14} />
                  Edit Tour Details
                </button>
              </div>

              <button type="button" className="btn btn-ghost" onClick={() => setSelectedTourDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 1: NEW / EDIT TOUR RENTAL ORDER */}
      <Modal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        title={editingTourCode ? `Edit Tour Details — ${editingTourCode}` : "Create New Tour / Modem Rental Order"}
      >
        <form onSubmit={handleSaveNewTour} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Tour Code *</label>
              <input
                className="form-input"
                placeholder="e.g. KIB260805"
                value={tourForm.tourcode}
                onChange={(e) => setTourForm({ ...tourForm, tourcode: e.target.value })}
                required
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Tour Leader (TL) *</label>
                <Link
                  href="/settings"
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent-cyan)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  ⚙️ Manage TL List
                </Link>
              </div>
              <select
                className="form-input form-select"
                value={tourForm.tl}
                onChange={(e) => setTourForm({ ...tourForm, tl: e.target.value })}
                required
              >
                <option value="">— Select Tour Leader —</option>
                {tourLeaders.map((tl) => (
                  <option key={tl.id} value={tl.name}>
                    {tl.name} {tl.phone ? `(${tl.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                value={tourForm.start_date}
                onChange={(e) => setTourForm({ ...tourForm, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className="form-input"
                value={tourForm.end_date}
                onChange={(e) => setTourForm({ ...tourForm, end_date: e.target.value })}
                required
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Drop-off Location / Hotel *</label>
              <input
                className="form-input"
                placeholder="e.g. Sri Phala Resort & Spa Sanur"
                value={tourForm.location}
                onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })}
                required
              />
            </div>

            {/* ASSIGNED MODEMS MULTI-SELECT PILLS FROM INVENTORY */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Select Assigned Modems from Inventory ({tourForm.selectedModemSsids.length} selected)
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                  Click to select / unselect
                </span>
              </div>

              {/* MODEM PILL GRID */}
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-glass)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(85px, 1fr))",
                  gap: 6,
                }}
              >
                {[...modems]
                  .sort((a, b) => a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" }))
                  .map((m) => {
                    const mcCode = m.ssid.replace("Media Creative ", "MC");
                    const isSelected = tourForm.selectedModemSsids.includes(mcCode);
                    const assignedTour = getAssignedTourForModem(m);
                    const isAssignedToThisTour = editingTourCode && assignedTour?.tourcode === editingTourCode;
                    const isAvailable = (m.status === "Available" && !assignedTour) || !!isAssignedToThisTour;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!isAvailable && !isSelected}
                        onClick={() => {
                          if (!isAvailable && !isSelected) return;
                          toggleModemSelectionInTour(mcCode);
                        }}
                        title={
                          !isAvailable
                            ? `Assigned / Unavailable (${assignedTour ? assignedTour.tourcode : m.remark || m.status})`
                            : `Available - Click to select ${mcCode}`
                        }
                        style={{
                          padding: "4px 6px",
                          borderRadius: 6,
                          border: `1px solid ${
                            isSelected
                              ? "var(--accent-cyan)"
                              : isAvailable
                              ? "var(--border)"
                              : "rgba(239, 68, 68, 0.25)"
                          }`,
                          background: isSelected
                            ? "var(--accent-cyan-dim)"
                            : isAvailable
                            ? "var(--bg-glass-hover)"
                            : "rgba(239, 68, 68, 0.05)",
                          color: isSelected
                            ? "var(--accent-cyan)"
                            : isAvailable
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                          fontSize: "0.72rem",
                          fontWeight: isSelected ? 800 : 500,
                          cursor: isAvailable || isSelected ? "pointer" : "not-allowed",
                          opacity: isAvailable || isSelected ? 1 : 0.45,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                          {isSelected ? (
                            <Check size={11} style={{ color: "var(--accent-cyan)" }} />
                          ) : !isAvailable ? (
                            <span style={{ fontSize: "0.55rem", color: "#f87171", fontWeight: 700 }}>✕</span>
                          ) : null}
                          <span>{mcCode}</span>
                        </div>
                        <span style={{ fontSize: "0.6rem", opacity: 0.8, color: !isAvailable && !isSelected ? "#f87171" : undefined }}>
                          {!isAvailable && !isSelected
                            ? (assignedTour ? assignedTour.tourcode : m.status)
                            : m.device_name.replace("Orbitmifi_", "")}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* DYNAMIC PER-MODEM PAX NAME INPUT FIELDS */}
            {tourForm.selectedModemSsids.length > 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "rgba(0,212,255,0.04)",
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--accent-cyan)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <User size={14} /> Assign Pax / Guest Name per Selected Modem:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {tourForm.selectedModemSsids.map((mcCode) => (
                    <div key={mcCode} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-primary)" }}>
                        Pax / Guest Name for <strong>{mcCode}</strong>
                      </label>
                      <input
                        className="form-input"
                        style={{ fontSize: "0.82rem", padding: "6px 10px" }}
                        placeholder={`e.g. Guest name for ${mcCode}...`}
                        value={tourForm.devicePaxMap[mcCode] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTourForm((prev) => ({
                            ...prev,
                            devicePaxMap: { ...prev.devicePaxMap, [mcCode]: val },
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Tour Status</label>
              <select
                className="form-input form-select"
                value={tourForm.status}
                onChange={(e) => setTourForm({ ...tourForm, status: e.target.value as TourRentalLog["status"] })}
              >
                <option value="Running">Running (Active)</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Finish">Finish</option>
              </select>
            </div>

            <div>
              <label className="form-label">Invoice Status</label>
              <select
                className="form-input form-select"
                value={tourForm.invoice_status}
                onChange={(e) => setTourForm({ ...tourForm, invoice_status: e.target.value as TourRentalLog["invoice_status"] })}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b" }}>
                <FileText size={14} />
                NOTES
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Ketik catatan khusus / field note jika ada hal yang perlu dicatat..."
                value={tourForm.notes}
                onChange={(e) => setTourForm({ ...tourForm, notes: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowTourModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTourCode ? <Edit2 size={14} /> : <Plus size={14} />}
              {editingTourCode ? "Save Tour Changes" : "Create Tour Rental Order"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT PHYSICAL MODEM DEVICE */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingModem ? "Edit Modem Device" : "Add New Modem Wifi"}
      >
        <form onSubmit={handleSubmitDevice} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Device Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Orbitmifi_6DF6"
                value={form.device_name}
                onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">SIM Number *</label>
              <input
                className="form-input"
                placeholder="e.g. 081329926886"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Modem / SSID Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Media Creative 1"
                value={form.ssid}
                onChange={(e) => setForm({ ...form, ssid: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">WiFi Password *</label>
              <input
                className="form-input"
                placeholder="e.g. MC1#2026"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ModemItem["status"] })}
              >
                <option value="Available">Available</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="form-label">Remark / Notes</label>
              <input
                className="form-input"
                placeholder="Optional notes..."
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              {editingModem ? "Update Device" : "Save Modem Device"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
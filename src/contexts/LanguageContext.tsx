import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "tr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "tr",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "en" || saved === "tr") ? saved : "tr";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback(
    (key: string) => {
      const translation = translations[language]?.[key];
      return translation ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const translations: Record<Language, Record<string, string>> = {
  tr: {
    // Login
    "login.title": "Giriş Yap",
    "login.subtitle": "Personel Yönetim Sistemi",
    "login.cardTitle": "Giriş Yap",
    "login.cardDescription": "Sisteme erişmek için bilgilerinizi girin",
    "login.email": "E-posta",
    "login.password": "Şifre",
    "login.submit": "Giriş Yap",
    "login.failed": "Giriş başarısız",

    // Nav & Sidebar
    "nav.dashboard": "Kontrol Paneli",
    "nav.roster": "Vardiya Takvimi",
    "nav.forecast": "Tahmin",
    "nav.staff": "Personel",
    "nav.extraHours": "Fazla Mesai",
    "nav.extraStaff": "Ek Personel",
    "nav.admin": "Kullanıcı Yönetimi",
    "nav.signOut": "Çıkış Yap",
    "nav.staffMgmt": "Personel Yönetimi",

    // Dashboard
    "dashboard.title": "Kontrol Paneli",
    "dashboard.subtitle": "Personel ve bekleyen onaylara genel bakış",
    "dashboard.totalStaff": "Toplam Personel",
    "dashboard.pendingHours": "Bekleyen Fazla Mesai",
    "dashboard.pendingStaff": "Bekleyen Ek Personel",
    "dashboard.totalPending": "Toplam Bekleyen",
    "dashboard.activeEmployees": "Aktif çalışanlar",
    "dashboard.awaitingApproval": "Onay bekliyor",
    "dashboard.actionRequired": "İşlem gerekli",
    "dashboard.recentExtraHours": "Son Fazla Mesai Talepleri",
    "dashboard.recentExtraStaff": "Son Ek Personel Talepleri",

    // Roster
    "roster.title": "Vardiya Takvimi",
    "roster.subtitle": "Personel programlarını görüntüle ve yönet",
    "roster.uploadedInfo": "Yüklenen vardiya — {staff} personel, {shifts} vardiya",
    "roster.template": "Şablon",
    "roster.uploadRoster": "Vardiya Yükle",
    "roster.clear": "Temizle",
    "roster.dropFile": "Bir vardiya Excel dosyası bırakın",
    "roster.orClick": "veya yüklemek için tıklayın — demo veriler aşağıda",
    "roster.selectDate": "Vardiya detaylarını görmek için bir tarih seçin",
    "roster.staffAssigned": "{count} personel atandı",
    "roster.noShifts": "Bu tarih için planlanmış vardiya yok",
    "roster.occupancyForecasted": "{rate}% doluluk öngörülüyor",
    "roster.morning": "Sabah",
    "roster.afternoon": "Öğleden Sonra",
    "roster.night": "Gece",
    "roster.dayOff": "İzinli",
    "roster.break": "Ara",
    "roster.highOcc": "Yüksek doluluk (90%+)",
    "roster.event": "Etkinlik",
    "roster.switchedBack": "Varsayılan vardiyaya dönüldü",

    // Forecast
    "forecast.title": "Otel Aktivite Tahmini",
    "forecast.subtitle": "Haftalık tahmininizi yükleyerek öngörülen aktiviteyi görüntüleyin",
    "forecast.downloadTemplate": "Şablon İndir",
    "forecast.clear": "Temizle",
    "forecast.dropFile": "Tahmin dosyanızı buraya bırakın",
    "forecast.orBrowse": "veya göz atmak için tıklayın — .xlsx, .xls, .csv",
    "forecast.chooseFile": "Dosya Seç",
    "forecast.avgOccupancy": "Ort. Doluluk",
    "forecast.totalRoomNights": "Toplam Oda Gecesi",
    "forecast.eventsScheduled": "Planlanan Etkinlikler",
    "forecast.peakDay": "En Yoğun Gün",
    "forecast.occupancyForecast": "Doluluk Tahmini",
    "forecast.chartHint": "O günün personel vardiyasını görmek için çubuğa tıklayın",
    "forecast.dailyBreakdown": "Günlük Detay",
    "forecast.occupancy": "Doluluk",
    "forecast.arrivals": "Giriş",
    "forecast.departures": "Çıkış",
    "forecast.roomNights": "Oda Gecesi",
    "forecast.totalRooms": "Toplam Oda",
    "forecast.events": "Etkinlikler",
    "forecast.day": "Gün",
    "forecast.date": "Tarih",
    "forecast.normal": "Normal",
    "forecast.high": "Yüksek",
    "forecast.critical": "Kritik",
    "forecast.templateDownloaded": "Şablon indirildi",
    "forecast.loaded": "Tahmin yüklendi — {count} gün",
    "forecast.parseFailed": "Dosya ayrıştırılamadı. Formatı kontrol edip tekrar deneyin.",
    "forecast.invalidFile": "Lütfen bir Excel (.xlsx, .xls) veya CSV dosyası yükleyin",
    "forecast.doubleClickHint": "Personel vardiyasını görmek için çift tıklayın",

    // Staff
    "staff.title": "Personel Rehberi",
    "staff.subtitle": "{count} aktif çalışan",

    // Extra Hours
    "extraHours.title": "Fazla Mesai Talepleri",
    "extraHours.subtitle": "Fazla mesai onaylarını gönderin ve yönetin",
    "extraHours.newRequest": "Yeni Talep",
    "extraHours.staffMember": "Personel",
    "extraHours.department": "Departman",
    "extraHours.date": "Tarih",
    "extraHours.hours": "Fazla Saat",
    "extraHours.reason": "Sebep",
    "extraHours.reasonPlaceholder": "Fazla mesai neden gerekli?",
    "extraHours.submit": "Talep Gönder",
    "extraHours.allRequests": "Tüm Talepler",
    "extraHours.selectStaff": "Personel seçin",
    "extraHours.selectDept": "Departman seçin",
    "extraHours.submitted": "Fazla mesai talebi gönderildi",
    "extraHours.fillAll": "Lütfen tüm alanları doldurun",

    // Extra Staff
    "extraStaff.title": "Ek Personel Talepleri",
    "extraStaff.subtitle": "Vardiyalar için ek personel talep edin",
    "extraStaff.newRequest": "Yeni Talep",
    "extraStaff.department": "Departman",
    "extraStaff.date": "Tarih",
    "extraStaff.shift": "Vardiya",
    "extraStaff.numberOfStaff": "Gereken Personel Sayısı",
    "extraStaff.requestedBy": "Talep Eden",
    "extraStaff.reason": "Sebep",
    "extraStaff.reasonPlaceholder": "Ek personel neden gerekli?",
    "extraStaff.submit": "Talep Gönder",
    "extraStaff.allRequests": "Tüm Talepler",
    "extraStaff.selectDept": "Departman seçin",
    "extraStaff.selectShift": "Vardiya seçin",
    "extraStaff.yourName": "Adınız",
    "extraStaff.submitted": "Ek personel talebi gönderildi",
    "extraStaff.fillAll": "Lütfen tüm alanları doldurun",

    // Admin
    "admin.title": "Kullanıcı Yönetimi",
    "admin.subtitle": "Yeni personel davet edin ve kullanıcı rollerini yönetin",
    "admin.inviteTitle": "Yeni Kullanıcı Davet Et",
    "admin.inviteDesc": "Yeni bir personele davet e-postası gönderin",
    "admin.email": "E-posta *",
    "admin.displayName": "Görünen Ad",
    "admin.role": "Rol *",
    "admin.department": "Departman",
    "admin.sendInvite": "Davet Gönder",
    "admin.allUsers": "Tüm Kullanıcılar",
    "admin.registeredUsers": "{count} kayıtlı kullanıcı",
    "admin.name": "Ad",
    "admin.joined": "Katılım",
    "admin.accessRequired": "Yönetici erişimi gerekli.",
    "admin.inviteSent": "Davet gönderildi!",
    "admin.inviteDesc2": "{email} {role} olarak davet edildi.",
    "admin.inviteFailed": "Davet başarısız",

    // Common
    "common.staff": "personel",
    "common.pending": "Beklemede",
    "common.approved": "Onaylandı",
    "common.rejected": "Reddedildi",

    // Permissions
    "permissions.cannotApprove": "Talepleri onaylama yetkiniz yok",
    "permissions.noRequests": "Görüntülenecek talep yok",
    "permissions.accessDenied": "Erişim engellendi",
  },
  en: {
    // Login
    "login.title": "Sign In",
    "login.subtitle": "Staff Management System",
    "login.cardTitle": "Sign In",
    "login.cardDescription": "Enter your credentials to access the system",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign In",
    "login.failed": "Login failed",

    // Nav & Sidebar
    "nav.dashboard": "Dashboard",
    "nav.roster": "Roster",
    "nav.forecast": "Forecast",
    "nav.staff": "Staff",
    "nav.extraHours": "Extra Hours",
    "nav.extraStaff": "Extra Staff",
    "nav.admin": "User Management",
    "nav.signOut": "Sign Out",
    "nav.staffMgmt": "Staff Management",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Overview of staff and pending approvals",
    "dashboard.totalStaff": "Total Staff",
    "dashboard.pendingHours": "Pending Extra Hours",
    "dashboard.pendingStaff": "Pending Extra Staff",
    "dashboard.totalPending": "Total Pending",
    "dashboard.activeEmployees": "Active employees",
    "dashboard.awaitingApproval": "Awaiting approval",
    "dashboard.actionRequired": "Action required",
    "dashboard.recentExtraHours": "Recent Extra Hours Requests",
    "dashboard.recentExtraStaff": "Recent Extra Staff Requests",

    // Roster
    "roster.title": "Roster Calendar",
    "roster.subtitle": "View and manage staff schedules",
    "roster.uploadedInfo": "Uploaded roster — {staff} staff, {shifts} shifts",
    "roster.template": "Template",
    "roster.uploadRoster": "Upload Roster",
    "roster.clear": "Clear",
    "roster.dropFile": "Drop a roster Excel file",
    "roster.orClick": "or click to upload — showing demo data below",
    "roster.selectDate": "Select a date to view shift details",
    "roster.staffAssigned": "{count} staff assigned",
    "roster.noShifts": "No shifts scheduled for this date",
    "roster.occupancyForecasted": "{rate}% occupancy forecasted",
    "roster.morning": "Morning",
    "roster.afternoon": "Afternoon",
    "roster.night": "Night",
    "roster.dayOff": "Day Off",
    "roster.break": "Break",
    "roster.highOcc": "High occ. (90%+)",
    "roster.event": "Event",
    "roster.switchedBack": "Switched back to default roster",

    // Forecast
    "forecast.title": "Hotel Activity Forecast",
    "forecast.subtitle": "Upload your weekly forecast to view projected activity",
    "forecast.downloadTemplate": "Download Template",
    "forecast.clear": "Clear",
    "forecast.dropFile": "Drop your forecast file here",
    "forecast.orBrowse": "or click to browse — .xlsx, .xls, .csv",
    "forecast.chooseFile": "Choose File",
    "forecast.avgOccupancy": "Avg. Occupancy",
    "forecast.totalRoomNights": "Total Room Nights",
    "forecast.eventsScheduled": "Events Scheduled",
    "forecast.peakDay": "Peak Day",
    "forecast.occupancyForecast": "Occupancy Forecast",
    "forecast.chartHint": "Click a bar to view staff roster for that day",
    "forecast.dailyBreakdown": "Daily Breakdown",
    "forecast.occupancy": "Occupancy",
    "forecast.arrivals": "Arrivals",
    "forecast.departures": "Departures",
    "forecast.roomNights": "Room Nights",
    "forecast.totalRooms": "Total Rooms",
    "forecast.events": "Events",
    "forecast.day": "Day",
    "forecast.date": "Date",
    "forecast.normal": "Normal",
    "forecast.high": "High",
    "forecast.critical": "Critical",
    "forecast.templateDownloaded": "Template downloaded",
    "forecast.loaded": "Forecast loaded — {count} days",
    "forecast.parseFailed": "Failed to parse file. Check the format and try again.",
    "forecast.invalidFile": "Please upload an Excel file (.xlsx, .xls) or CSV",
    "forecast.doubleClickHint": "Double-click to view staff roster",

    // Staff
    "staff.title": "Staff Directory",
    "staff.subtitle": "{count} active employees",

    // Extra Hours
    "extraHours.title": "Extra Hours Requests",
    "extraHours.subtitle": "Submit and manage overtime approvals",
    "extraHours.newRequest": "New Request",
    "extraHours.staffMember": "Staff Member",
    "extraHours.department": "Department",
    "extraHours.date": "Date",
    "extraHours.hours": "Extra Hours",
    "extraHours.reason": "Reason",
    "extraHours.reasonPlaceholder": "Why are extra hours needed?",
    "extraHours.submit": "Submit Request",
    "extraHours.allRequests": "All Requests",
    "extraHours.selectStaff": "Select staff",
    "extraHours.selectDept": "Select department",
    "extraHours.submitted": "Extra hours request submitted",
    "extraHours.fillAll": "Please fill in all fields",

    // Extra Staff
    "extraStaff.title": "Extra Staff Requests",
    "extraStaff.subtitle": "Request additional staffing for shifts",
    "extraStaff.newRequest": "New Request",
    "extraStaff.department": "Department",
    "extraStaff.date": "Date",
    "extraStaff.shift": "Shift",
    "extraStaff.numberOfStaff": "Number of Staff Needed",
    "extraStaff.requestedBy": "Requested By",
    "extraStaff.reason": "Reason",
    "extraStaff.reasonPlaceholder": "Why is extra staff needed?",
    "extraStaff.submit": "Submit Request",
    "extraStaff.allRequests": "All Requests",
    "extraStaff.selectDept": "Select department",
    "extraStaff.selectShift": "Select shift",
    "extraStaff.yourName": "Your name",
    "extraStaff.submitted": "Extra staff request submitted",
    "extraStaff.fillAll": "Please fill in all fields",

    // Admin
    "admin.title": "User Management",
    "admin.subtitle": "Invite new staff and manage user roles",
    "admin.inviteTitle": "Invite New User",
    "admin.inviteDesc": "Send an invitation email to a new staff member",
    "admin.email": "Email *",
    "admin.displayName": "Display Name",
    "admin.role": "Role *",
    "admin.department": "Department",
    "admin.sendInvite": "Send Invitation",
    "admin.allUsers": "All Users",
    "admin.registeredUsers": "{count} registered users",
    "admin.name": "Name",
    "admin.joined": "Joined",
    "admin.accessRequired": "Admin access required.",
    "admin.inviteSent": "Invitation sent!",
    "admin.inviteDesc2": "{email} has been invited as {role}.",
    "admin.inviteFailed": "Invitation failed",

    // Common
    "common.staff": "staff",
    "common.pending": "Pending",
    "common.approved": "Approved",
    "common.rejected": "Rejected",
  },
};

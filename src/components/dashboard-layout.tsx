"use client";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Package2,
  LayoutDashboard,
  Users,
  Briefcase,
  UserRoundCheck,
  Home,
  CalendarClock,
  StickyNote,
  MapPin,
} from "lucide-react";
import { useState, useEffect, type CSSProperties } from "react";
import { logout as authLogout } from "@/lib/services/auth";
import { getUser } from "@/lib/auth-storage";
import { getGeneralSettings } from "@/lib/services/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/i18n";
import { AVATAR_CONFIG } from "@/config/ui-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

type DashboardLayoutProps = { onLogout: () => void };

export default function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [appName, setAppName] = useState<string>("Admin Dashboard");
  const { TEXT, lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current active menu item from URL
  const getActiveMenuFromPath = (pathname: string) => {
    if (pathname.startsWith('/clients')) return 'Clients';
    if (pathname.startsWith('/guards')) return 'Guards';
    if (pathname.startsWith('/users')) return 'Users';
    if (pathname.startsWith('/properties')) return 'Properties';
    if (pathname.startsWith('/shifts')) return 'Shifts';
    if (pathname.startsWith('/services')) return 'Services';
    if (pathname.startsWith('/notes')) return 'Notes';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/map')) return 'Map';
    return 'Dashboard';
  };

  const activeMenuItem = getActiveMenuFromPath(location.pathname);

  // Fetch app name from API
  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const settings = await getGeneralSettings();
        if (settings.app_name) {
          setAppName(settings.app_name);
          // Update browser tab title too
          document.title = settings.app_name;
        }
      } catch (error) {
        console.warn('Failed to fetch app name from API:', error);
        // Keep fallback name
      }
    };

    fetchAppName();
  }, []);

  // Derive cool initials and a unique gradient from saved user claims
  const claims = getUser();
  const username: string = (claims?.username ?? "").toString();
  const firstName: string = (
    claims?.first_name ??
    claims?.firstName ??
    ""
  ).toString();
  const lastName: string = (
    claims?.last_name ??
    claims?.lastName ??
    ""
  ).toString();

  const initials = (() => {
    const f = firstName.trim();
    const l = lastName.trim();
    const max = AVATAR_CONFIG.initialsMaxLen;
    if (f && l) return (f[0] + l[0]).slice(0, max).toUpperCase();
    if (f) return f.slice(0, max).toUpperCase();
    if (username) return username.slice(0, max).toUpperCase();
    return AVATAR_CONFIG.fallbackInitial;
  })();

  const hueBase = (() => {
    const s = username || `${claims?.user_id ?? ""}`;
    let hash = 0;
    for (let i = 0; i < s.length; i++)
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return hash % 360;
  })();
  const hueShift = AVATAR_CONFIG.hueShift;
  const gradStart = `hsl(${hueBase} 70% 45%)`;
  const gradEnd = `hsl(${(hueBase + hueShift) % 360} 70% 55%)`;
  // Role-based palette with deterministic fallback
  const roleRaw = (claims?.role ?? claims?.user_role ?? "")
    .toString()
    .toLowerCase();
  const isAdmin =
    !!claims?.is_admin ||
    roleRaw === "admin" ||
    roleRaw === "superuser" ||
    roleRaw === "staff";
  const role = roleRaw || (isAdmin ? "admin" : "");
  const [finalStart, finalEnd] = AVATAR_CONFIG.roleGradients[role] ?? [
    gradStart,
    gradEnd,
  ];
  const avatarStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${finalStart}, ${finalEnd})`,
    color: "white",
  };
  const avatarClass = `${AVATAR_CONFIG.sizeClass} ${AVATAR_CONFIG.ringClass}`;

  const menuItems = [
    {
      key: "Dashboard",
      label: TEXT.menu?.dashboard ?? "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      key: "Clients",
      label: TEXT.menu?.clients ?? "Clients",
      icon: Briefcase,
      path: "/clients",
    },
    {
      key: "Guards",
      label: TEXT.menu?.guards ?? "Guards",
      icon: Users,
      path: "/guards",
    },
    {
      key: "Map",
      label: TEXT.menu?.map ?? "Map",
      icon: MapPin,
      path: "/map",
    },
    {
      key: "Users",
      label: TEXT.menu?.users ?? "Users",
      icon: UserRoundCheck,
      path: "/users",
    },
    {
      key: "Properties",
      label: TEXT.menu?.properties ?? "Properties",
      icon: Home,
      path: "/properties",
    },
    {
      key: "Shifts",
      label: TEXT.menu?.shifts ?? "Shifts",
      icon: CalendarClock,
      path: "/shifts",
    },
    {
      key: "Services",
      label: TEXT.menu?.services ?? "Services",
      icon: Package2,
      path: "/services",
    },
    {
      key: "Notes",
      label: TEXT.menu?.notes ?? "Notes",
      icon: StickyNote,
      path: "/notes",
    },
  ];

  const renderMainContent = () => {
    return <Outlet />;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar collapsible="icon" side="left">
          <SidebarHeader className="p-2">
            <Link to="#" className="flex items-center gap-2 font-semibold p-2">
              <Package2 className="h-6 w-6" />
              <span className="group-data-[state=collapsed]:hidden">
                {appName}
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                {TEXT.sidebar?.navigationLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(({ key, label, icon: Icon, path }) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        onClick={() => navigate(path)}
                        className={activeMenuItem === key ? "bg-muted" : ""}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1 lg:hidden" />
            <div className="flex-1" />

            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">{TEXT.header?.notificationsAria}</span>
            </Button>

            {/* Language segmented toggle */}
            <div className="mx-2">
              <div
                role="group"
                aria-label={TEXT.accountMenu?.language}
                className="inline-flex items-stretch rounded-md border overflow-hidden bg-background"
              >
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-r ${
                    lang === "en"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lang === "en" ? "EN" : "EN"}
                </button>
                <button
                  type="button"
                  onClick={() => setLang("es")}
                  aria-pressed={lang === "es"}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    lang === "es"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lang === "es" ? "ES" : "ES"}
                </button>
              </div>
            </div>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className={avatarClass}>
                    <AvatarFallback style={avatarStyle}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">{TEXT.header?.userMenuAria}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>{TEXT.accountMenu?.settings}</DropdownMenuItem>
                <DropdownMenuItem>{TEXT.accountMenu?.support}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{TEXT.accountMenu?.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {renderMainContent()}

          {/* Logout confirmation dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{TEXT.logoutDialog?.title}</DialogTitle>
                <DialogDescription>
                  {TEXT.logoutDialog?.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  {TEXT.logoutDialog?.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setConfirmOpen(false);
                    try {
                      await authLogout();
                      toast.success(TEXT.logoutDialog?.successToast);
                    } finally {
                      onLogout();
                    }
                  }}
                >
                  {TEXT.logoutDialog?.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

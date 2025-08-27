"use client";

import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Bell,
  LogOut,
  Package2,
  LayoutDashboard,
  Users,
  Briefcase,
  UserRoundCheck,
  Home,
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

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { TEXT, lang, setLang } = useI18n();
  
  // Hook para obtener el nombre de la aplicación desde la API
  const [appName, setAppName] = useState<string>("");
  
  useEffect(() => {
    const fetchAppName = async () => {
      try {
        console.log("Fetching app name from API...");
        const settings = await getGeneralSettings();
        console.log("API response:", settings);
        if (settings?.app_name) {
          setAppName(settings.app_name);
          console.log("App name updated to:", settings.app_name);
        } else {
          setAppName("Admin Dashboard"); // Fallback genérico si la API no devuelve app_name
        }
      } catch (error) {
        console.error("Error fetching app name:", error);
        // Si la API falla completamente, usar un fallback genérico
        setAppName("Admin Dashboard");
      }
    };

    fetchAppName();
  }, []);

  // Actualizar el título de la pestaña del navegador
  useEffect(() => {
    if (appName) {
      document.title = appName;
    }
  }, [appName]);

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
      key: "dashboard",
      path: "/dashboard",
      label: TEXT.menu.dashboard,
      icon: LayoutDashboard,
    },
    {
      key: "clients",
      path: "/clients",
      label: TEXT.menu.clients,
      icon: Briefcase,
    },
    {
      key: "guards",
      path: "/guards",
      label: TEXT.menu.guards,
      icon: Users,
    },
    {
      key: "users",
      path: "/users",
      label: TEXT.menu.users,
      icon: UserRoundCheck,
    },
    {
      key: "properties",
      path: "/properties",
      label: TEXT.menu.properties,
      icon: Home,
    },
  ];

  
  // Obtener la página activa basada en la ruta actual
  const currentPath = location.pathname;
  const activeMenuItem = menuItems.find(item => 
    currentPath === item.path || currentPath.startsWith(item.path + '/')
  )?.key || 'dashboard';

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Forzar logout local aunque falle la API
      localStorage.removeItem('isLoggedIn');
      navigate('/login');
    }
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
                {TEXT.sidebar.navigationLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(({ key, path, label, icon: Icon }) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton asChild>
                        <Link 
                          to={path}
                          className={activeMenuItem === key ? "bg-muted" : ""}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </Link>
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
              <span className="sr-only">{TEXT.header.notificationsAria}</span>
            </Button>

            {/* Language segmented toggle: | EN* | ES | */}
            <div className="mx-2">
              <div
                role="group"
                aria-label={TEXT.accountMenu.language}
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

            {/* Theme Toggle */}
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className={avatarClass}>
                    <AvatarFallback style={avatarStyle}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">{TEXT.header.userMenuAria}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Language options moved to header segmented toggle */}
                <DropdownMenuItem>{TEXT.accountMenu.settings}</DropdownMenuItem>
                <DropdownMenuItem>{TEXT.accountMenu.support}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{TEXT.accountMenu.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>

          {/* Logout confirmation dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{TEXT.logoutDialog.title}</DialogTitle>
                <DialogDescription>
                  {TEXT.logoutDialog.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  {TEXT.logoutDialog.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setConfirmOpen(false);
                    try {
                      await authLogout();
                      // Toast notification
                      toast.success(TEXT.logoutDialog.successToast);
                    } finally {
                      handleLogout();
                    }
                  }}
                >
                  {TEXT.logoutDialog.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

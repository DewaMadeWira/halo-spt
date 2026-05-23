import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/Components/ui/sidebar";
import { PropsWithChildren } from "react";
import { Link, usePage } from "@inertiajs/react";
import { Toaster } from "@/Components/ui/sonner";

export default function SidebarLayout({ children }: PropsWithChildren) {
    const user = usePage().props.auth.user as { role?: string } | null;
    const role = user?.role?.toLowerCase();

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="px-4 py-3">
                        <div className="text-lg font-semibold">Halo SPT</div>
                        <div className="text-sm text-muted-foreground">
                            {user?.role === "ar" ? "AR User" : "Admin"}
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <nav className="px-2 py-1">
                            <Link
                                href={route('dashboard')}
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Dashboard
                            </Link>
                            {role === "admin" ? (
                                <>
                                    <Link
                                        href={route('master-data')}
                                        className="block py-2 px-3 rounded hover:bg-muted"
                                    >
                                        Master Data
                                    </Link>
                                    <Link
                                        href={route('ar-data')}
                                        className="block py-2 px-3 rounded hover:bg-muted"
                                    >
                                        AR Data
                                    </Link>
                                    <Link
                                        href={route('assign-ar-data')}
                                        className="block py-2 px-3 rounded hover:bg-muted"
                                    >
                                        Assign AR Data
                                    </Link>
                                </>
                            ) : null}
                            {role === "ar" ? (
                                <>
                                    <Link
                                        href={route('my-assignments')}
                                        className="block py-2 px-3 rounded hover:bg-muted"
                                    >
                                        My Assignments
                                    </Link>
                                    <Link
                                        href={route('assignment-templates')}
                                        className="block py-2 px-3 rounded hover:bg-muted"
                                    >
                                        Assignment Templates
                                    </Link>
                                </>
                            ) : null}
                        </nav>
                    </SidebarGroup>
                    <SidebarGroup>
                        <nav className="px-2 py-1">
                            <a
                                href="/settings"
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Settings
                            </a>
                        </nav>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <nav className="px-2 py-1">
                        <Link href={route("logout")} method="post" as="button">
                            Log Out
                        </Link>
                    </nav>
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                        v0.1 — Test Sidebar
                    </div>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="bg-gray-100">
                <SidebarTrigger />
                {children}
                <Toaster richColors closeButton position="top-right" />
            </SidebarInset>
        </SidebarProvider>
    );
}

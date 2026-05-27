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
            <Sidebar className="bg-blue-900 text-white border-r border-blue-800">
                <SidebarHeader className="bg-blue-900">
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-blue-900 font-bold text-sm">
                                📄
                            </div>
                            <div>
                                <div className="text-sm font-bold text-amber-400 tracking-wide">
                                    HALO SPT
                                </div>
                                <div className="text-xs text-blue-300">
                                    {user?.role === "ar" ? "AR User" : "Admin"}
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent className="bg-blue-900">
                    <SidebarGroup>
                        <nav className="px-2 py-1 space-y-1">
                            <Link
                                href={route("dashboard")}
                                className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                            >
                                Dashboard
                            </Link>
                            {role === "admin" ? (
                                <>
                                    <Link
                                        href={route("master-data")}
                                        className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                                    >
                                        Master Data
                                    </Link>
                                    <Link
                                        href={route("ar-data")}
                                        className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                                    >
                                        AR Data
                                    </Link>
                                    <Link
                                        href={route("assign-ar-data")}
                                        className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                                    >
                                        Assign AR Data
                                    </Link>
                                </>
                            ) : null}
                            {role === "ar" ? (
                                <>
                                    <Link
                                        href={route("my-assignments")}
                                        className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                                    >
                                        My Assignments
                                    </Link>
                                    <Link
                                        href={route("assignment-templates")}
                                        className="block py-2 px-3 rounded text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                                    >
                                        Assignment Templates
                                    </Link>
                                </>
                            ) : null}
                        </nav>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter className="bg-blue-900">
                    <div className="px-2 py-1 border-t border-blue-800">
                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="block w-full text-left py-2 px-3 rounded text-blue-300 hover:bg-blue-800 hover:text-white transition-colors text-sm"
                        >
                            Log Out
                        </Link>
                    </div>
                    <div className="px-4 py-3 text-xs text-blue-400">
                        v0.1 — Halo SPT !
                    </div>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="bg-blue-50">
                <SidebarTrigger className="text-blue-900 hover:bg-blue-100" />
                {children}
                <Toaster richColors closeButton position="top-right" />
            </SidebarInset>
        </SidebarProvider>
    );
}

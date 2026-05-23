import { Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/Components/ui/button';
import SidebarLayout from '@/Layouts/SidebarLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/Components/ui/chart';

interface DashboardProps {
    dashboard: {
        userName: string;
        role: string;
        summary: Array<{
            title: string;
            value: string | number;
            description: string;
        }>;
        chart: {
            title: string;
            data: Array<{ label: string; count: number }>;
        };
        recentAssignments?: Array<Record<string, string | number>>;
        recentImports?: Array<Record<string, string | null>>;
        statusCounts?: Record<string, number>;
    };
}

export default function Dashboard({ dashboard }: DashboardProps) {
    const user = usePage().props.auth.user as {
        name: string;
        role?: string;
    };

    const isAdmin = dashboard.role === 'admin';

    return (
        <SidebarLayout>
            <Head title="Dashboard" />

            <div className="p-5">
                <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Welcome back, {dashboard.userName}</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{isAdmin ? 'Admin dashboard' : 'AR dashboard'}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            {isAdmin
                                ? 'Quick insight into your imports, assignments, and master records.'
                                : 'Review your assignments, recent activity, and upcoming periods.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {isAdmin ? (
                            <Button asChild>
                                <Link href="/master-data">Manage Master Data</Link>
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href="/my-assignments">Open My Assignments</Link>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href="/profile">
                                Profile <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {dashboard.summary.map((item) => (
                        <div
                            key={item.title}
                            className="rounded-3xl border border-border bg-white p-6 shadow-sm"
                        >
                            <p className="text-sm font-medium text-muted-foreground">
                                {item.title}
                            </p>
                            <p className="mt-4 text-3xl font-semibold tracking-tight">
                                {item.value}
                            </p>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </section>

                <section className="mt-8 grid gap-4 xl:grid-cols-[2fr_1fr]">
                    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {dashboard.chart.title}
                                </p>
                                <h2 className="mt-2 text-xl font-semibold">Recent activity</h2>
                            </div>
                            <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {isAdmin ? 'Assignments' : 'My activity'}
                            </div>
                        </div>

                        <div className="mt-6 h-[320px]">
                            <ChartContainer
                                id="dashboard-trend"
                                config={{ assignments: { label: 'Assignments', color: '#0ea5e9' } }}
                            >
                                <LineChart data={dashboard.chart.data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" stroke="#6b7280" tickLine={false} />
                                    <YAxis stroke="#6b7280" tickLine={false} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#0ea5e9"
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                            <ChartLegend content={<ChartLegendContent />} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isAdmin ? (
                            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Pending import status</p>
                                        <h3 className="mt-2 text-lg font-semibold">Import health</h3>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {Object.entries(dashboard.statusCounts ?? {}).map(([status, count]) => (
                                        <div key={status} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                                            <span className="text-sm capitalize text-muted-foreground">{status}</span>
                                            <span className="text-sm font-semibold">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(dashboard.statusCounts ?? {}).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No import activity yet.</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Recent assignments</p>
                                    <h3 className="mt-2 text-lg font-semibold">Latest companies</h3>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {(dashboard.recentAssignments ?? []).map((assignment, index) => (
                                        <div key={`${assignment.npwp}-${index}`} className="rounded-2xl border border-border p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold">{assignment.taxpayer_name ?? assignment.npwp}</p>
                                                    <p className="text-sm text-muted-foreground">{assignment.npwp}</p>
                                                </div>
                                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                                    {assignment.period}
                                                </span>
                                            </div>
                                            <div className="mt-3 text-sm text-muted-foreground">
                                                {assignment.email ?? assignment.whatsapp_number ? (
                                                    <>
                                                        {assignment.email ? `Email: ${assignment.email}` : ''}
                                                        {assignment.email && assignment.whatsapp_number ? ' · ' : ''}
                                                        {assignment.whatsapp_number ? `WA: ${assignment.whatsapp_number}` : ''}
                                                    </>
                                                ) : (
                                                    'No contact details available.'
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(dashboard.recentAssignments ?? []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No recent assignments yet.</p>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Quick actions</p>
                                    <h3 className="mt-2 text-lg font-semibold">Jump to pages</h3>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-3">
                                {isAdmin ? (
                                    <>
                                        <Button asChild variant="outline">
                                            <Link href="/master-data">Master Data</Link>
                                        </Button>
                                        <Button asChild variant="outline">
                                            <Link href="/ar-data">AR Data</Link>
                                        </Button>
                                        <Button asChild variant="outline">
                                            <Link href="/assign-ar-data">Assign AR Data</Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button asChild variant="outline">
                                        <Link href="/my-assignments">My Assignments</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </SidebarLayout>
    );
}

import ApplicationLogo from "@/Components/ApplicationLogo";
import { Link } from "@inertiajs/react";
import { PropsWithChildren } from "react";

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-blue-900 pt-6 sm:justify-center sm:pt-0">
            <div className="flex justify-center items-center flex-col">
                {/* <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" />
                </Link> */}

                {/* <h1 className="text-amber-400 text-3xl font-bold ">HALO SPT</h1> */}
                <img
                    src="/logo-spt.png"
                    alt="Halo SPT"
                    className="h-52 w-auto"
                />
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";

interface HeaderProps {
    dataSource: "api" | "local" | null;
}

export function Header({ dataSource }: HeaderProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: "smooth"
            });
        }
    };

    return (
        <header 
            className={`fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-white/20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            }`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 sm:px-12">
                {/* Partnership Logo Section */}
                <div 
                    className="flex items-center gap-5 cursor-pointer group" 
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-ink group-hover:scale-105 transition-transform duration-500">
                        <svg viewBox="0 0 375 375" className="h-7 w-7 fill-white">
                            <path d="M 139.167969 356.25 C 113.304688 356.25 76.800781 348.699219 40.335938 315.890625 L 68.953125 284.082031 C 120.085938 330.109375 173.367188 311.925781 189.820312 296.570312 C 190.917969 295.457031 192.015625 294.417969 193.109375 293.335938 C 139.25 288.089844 99.890625 249.9375 97.175781 247.25 C 55.929688 206.625 46.550781 151.515625 75.914062 121.671875 C 105.277344 91.832031 160.5 100.269531 201.773438 140.757812 C 205.386719 144.214844 245.59375 183.675781 253.480469 233.640625 C 256.441406 231.429688 259.265625 229.058594 261.949219 226.523438 C 264.636719 223.988281 267.164062 221.304688 269.539062 218.472656 C 271.914062 215.644531 274.113281 212.6875 276.144531 209.601562 C 278.171875 206.515625 280.015625 203.320312 281.675781 200.019531 C 283.335938 196.722656 284.796875 193.335938 286.0625 189.867188 C 287.328125 186.394531 288.386719 182.863281 289.242188 179.269531 C 290.097656 175.675781 290.738281 172.046875 291.171875 168.378906 C 291.605469 164.710938 291.824219 161.03125 291.828125 157.335938 C 291.855469 154.207031 291.722656 151.089844 291.433594 147.972656 C 291.144531 144.859375 290.703125 141.769531 290.101562 138.699219 C 289.5 135.628906 288.746094 132.597656 287.839844 129.605469 C 286.9375 126.613281 285.882812 123.671875 284.679688 120.785156 C 283.476562 117.898438 282.132812 115.078125 280.648438 112.328125 C 279.160156 109.574219 277.539062 106.90625 275.785156 104.316406 C 274.027344 101.730469 272.148438 99.234375 270.140625 96.835938 C 268.132812 94.4375 266.011719 92.148438 263.773438 89.960938 C 245.015625 71.640625 218.464844 61.554688 189.160156 61.554688 L 189.160156 18.75 C 229.660156 18.75 266.769531 33.148438 293.644531 59.277344 C 320.09375 85.011719 334.664062 119.804688 334.664062 157.335938 C 334.660156 160.742188 334.527344 164.140625 334.269531 167.535156 C 334.015625 170.929688 333.632812 174.3125 333.125 177.679688 C 332.621094 181.046875 331.988281 184.390625 331.238281 187.710938 C 330.484375 191.03125 329.609375 194.320312 328.613281 197.574219 C 327.613281 200.832031 326.5 204.046875 325.265625 207.21875 C 324.03125 210.394531 322.683594 213.515625 321.21875 216.589844 C 319.753906 219.664062 318.175781 222.679688 316.488281 225.636719 C 314.800781 228.59375 313.007812 231.484375 311.105469 234.308594 C 309.203125 237.132812 307.199219 239.886719 305.097656 242.5625 C 302.992188 245.238281 300.789062 247.835938 298.496094 250.347656 C 296.199219 252.863281 293.8125 255.289062 291.335938 257.625 C 288.859375 259.964844 286.300781 262.207031 283.660156 264.355469 C 281.019531 266.503906 278.300781 268.550781 275.507812 270.5 C 272.71875 272.449219 269.855469 274.289062 266.925781 276.027344 C 264 277.761719 261.007812 279.390625 257.960938 280.90625 C 254.910156 282.421875 251.808594 283.820312 248.65625 285.109375 C 242.808594 300.578125 232.90625 314.878906 219.042969 327.859375 C 205.402344 340.585938 178.753906 354.6875 144.792969 356.125 C 142.972656 356.21875 141.097656 356.257812 139.167969 356.25 M 121.167969 146.394531 C 115.191406 146.394531 110.058594 148.011719 106.457031 151.667969 C 95.925781 162.382812 102.589844 192.507812 127.269531 216.820312 L 127.382812 216.945312 C 127.734375 217.285156 166.351562 254.734375 212.109375 250.894531 L 212.109375 250.824219 C 212.320312 210.421875 172.621094 172.117188 172.214844 171.722656 L 171.933594 171.453125 C 157.265625 157.011719 136.453125 146.394531 121.167969 146.394531 " />
                        </svg>
                    </div>
                    <div>
                        <span className="font-display text-2xl font-medium tracking-tight text-ink flex items-center">
                            <span className="relative flex">
                                <span>S</span>
                                <span className="plus-gradient-spin absolute -right-[17px] -top-[5px] text-[1.1em] font-bold leading-none">
                                    +
                                </span>
                            </span>
                            <span className="ml-[22px]">Label</span>
                        </span>
                    </div>
                </div>

                {/* Centered Navigation Tabs */}
                <nav className="hidden items-center gap-10 lg:flex absolute left-1/2 -translate-x-1/2">
                    <button 
                        onClick={() => scrollToSection("features")}
                        className="text-sm font-medium tracking-wide text-ink hover:text-brand transition-colors"
                    >
                        SOLUTIONS
                    </button>
                    <button 
                        onClick={() => scrollToSection("upload")}
                        className="text-sm font-medium tracking-wide text-ink hover:text-brand transition-colors"
                    >
                        PLANNING
                    </button>
                    <button 
                        onClick={() => scrollToSection("workspace")}
                        className="text-sm font-medium tracking-wide text-ink hover:text-brand transition-colors"
                    >
                        DASHBOARD
                    </button>
                </nav>

                {/* Right Side Buttons */}
                <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-100 bg-white/40 px-5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur">
                            <ShieldCheck className={`h-4 w-4 ${dataSource ? "text-success" : "text-slate-300"}`} />
                            {dataSource ? "SECURE NODE" : "AWAITING NODE"}
                        </div>
                        <button 
                            onClick={() => scrollToSection("file-uploader-box")}
                            className="flex items-center gap-2 rounded-full border border-slate-100 bg-white/40 px-5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white/60 hover:text-ink cursor-pointer"
                        >
                            TRY NOW
                            <ArrowRight className="h-4 w-4 text-brand" />
                        </button>
                    </div>
                </div>
        </header>
    );
}

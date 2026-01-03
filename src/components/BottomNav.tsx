
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Home,
    CalendarDays,
    PieChart
} from 'lucide-react';

const BottomNav = () => {
    const navLinks = [
        {
            to: '/app/inmuebles/editar', // Mapped to Dashboard.tsx (Valuations)
            label: 'Dashboard',
            icon: PieChart
        },
        {
            to: '/app/clients',
            label: 'Clientes',
            icon: Users
        },
        {
            to: '/app', // Mapped to ControlPanel.tsx
            label: 'Panel',
            icon: LayoutDashboard,
            isMain: true
        },
        {
            to: '/app/inmuebles',
            label: 'Inmuebles',
            icon: Home
        },
        {
            to: '/app/calendar',
            label: 'Calendario',
            icon: CalendarDays
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-end h-16 pb-2">
                {navLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center w-full h-full transition-colors relative
                            ${link.isMain ? '-mt-6' : ''} 
                            ${isActive && !link.isMain ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                {link.isMain ? (
                                    <div className={`
                                        flex flex-col items-center justify-center
                                        w-14 h-14 rounded-full shadow-lg border-4 border-white transform translate-y-[-10%]
                                        ${isActive ? 'bg-brand text-white' : 'bg-slate-800 text-white'}
                                    `}>
                                        <link.icon className="w-6 h-6" />
                                    </div>
                                ) : (
                                    <>
                                        <link.icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                        <span className="text-[10px] font-medium leading-none">{link.label}</span>
                                        {isActive && (
                                            <span className="absolute -top-1 w-1 h-1 bg-brand rounded-full" />
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;

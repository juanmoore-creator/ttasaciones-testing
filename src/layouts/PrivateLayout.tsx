import { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, FolderOpen, Users, CalendarDays, LayoutDashboard, Menu, X } from 'lucide-react';


const PrivateLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLinks = [
        { to: '/app', text: 'Panel de Control', icon: LayoutDashboard },
        { to: '/app/inmuebles', text: 'Inmuebles', icon: Home },
        { to: '/app/clients', text: 'Clientes', icon: Users },
        { to: '/app/calendar', text: 'Calendario', icon: CalendarDays },
        { to: '/app/archivos', text: 'Archivos', icon: FolderOpen },
    ];

    const linkClass = "flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors";
    const activeLinkClass = "bg-slate-100 text-slate-900";


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/app')}
                    >
                        <div className="bg-brand p-1.5 rounded-lg">
                            <Home className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-xl text-gray-800">
                            Lopez <span className="text-brand">Bienes Raíces</span>
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-2">
                        {navLinks.map(link => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}
                            >
                                <link.icon className="w-4 h-4" />
                                <span>{link.text}</span>
                            </NavLink>
                        ))}
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-gray-500 hover:text-brand transition-colors p-2 rounded-lg hover:bg-gray-100"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
                        <nav className="flex flex-col gap-2 p-4">
                            {navLinks.map(link => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}
                                >
                                    <link.icon className="w-5 h-5" />
                                    <span>{link.text}</span>
                                </NavLink>
                            ))}
                            <div className="border-t border-slate-100 my-2"></div>
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMenuOpen(false);
                                }}
                                className={`${linkClass} text-red-600 hover:bg-red-50 hover:text-red-700`}
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Cerrar Sesión</span>
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>


        </div>
    );
};

export default PrivateLayout;

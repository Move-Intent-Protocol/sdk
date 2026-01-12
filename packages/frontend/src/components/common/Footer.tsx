
import { Link } from 'react-router-dom';
import { Twitter, Github, BookOpen } from 'lucide-react';

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background py-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link to="/home" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground">
                                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="font-heading font-bold text-xl tracking-tight">
                                Intent<span className="text-primary">Protocol</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            The fastest intent-based swap protocol on Movement.
                            Gasless, secure, and cross-chain ready.
                        </p>
                    </div>

                    {/* Columns */}
                    <div>
                        <h4 className="font-bold mb-4">Protocol</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/swap" className="hover:text-primary transition-colors">Swap</Link></li>
                            <li><Link to="/cross-chain" className="hover:text-primary transition-colors">Cross-Chain</Link></li>
                            <li><Link to="/oracle" className="hover:text-primary transition-colors">Oracle</Link></li>
                            <li><Link to="/resolver" className="hover:text-primary transition-colors">Resolver</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Github</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Audit Reports</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Community</h4>
                        <div className="flex gap-4">
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <BookOpen className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <Github className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© 2026 Intent Protocol. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

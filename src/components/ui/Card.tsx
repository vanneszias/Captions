import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 transition-all",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

export { Card }; 
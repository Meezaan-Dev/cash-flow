import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MotionRevealProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	y?: number;
}

const MotionReveal: React.FC<MotionRevealProps> = ({
	children,
	className,
	delay = 0,
	duration = 0.55,
	y = 24,
}) => {
	return (
		<motion.div
			className={cn(className)}
			initial={{ opacity: 0, y }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-40px' }}
			transition={{ duration, delay, ease: 'easeOut' }}
		>
			{children}
		</motion.div>
	);
};

export default MotionReveal;

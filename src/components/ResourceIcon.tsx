import React from 'react';
import { Laptop, Tv, Projector, Volume2, Sun, BookOpen, FlaskConical } from 'lucide-react';

interface ResourceIconProps {
  iconName: string;
  className?: string;
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({ iconName, className = 'w-6 h-6' }) => {
  switch (iconName) {
    case 'laptop':
      return <Laptop className={className} />;
    case 'tv':
      return <Tv className={className} />;
    case 'projector':
      return <Projector className={className} />;
    case 'speaker':
      return <Volume2 className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'flask':
      return <FlaskConical className={className} />;
    default:
      return <Laptop className={className} />;
  }
};

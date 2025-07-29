import React from 'react';
import { FamilyMember } from '../familyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface ProfileCardProps {
  member: FamilyMember;
  onClose: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ member, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-96 relative bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <X size={20} />
        </button>
        <CardHeader className="flex flex-col items-center text-center pt-8">
          <img src={member.profilePicture} alt={member.name} className="w-28 h-28 rounded-full border-4 border-white dark:border-slate-700 shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-[#0ea5e0]" />
          <CardTitle className="mt-5 text-2xl font-bold text-slate-800 dark:text-slate-100">{member.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <p className="text-md text-slate-600 dark:text-slate-400"><strong>Gender:</strong> {member.gender}</p>
          {/* More details like birth date, etc., can be added here later */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCard;

import React from 'react';
import { View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { ChatThread } from '../../components/ChatThread';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types/domain';

export const StudentMessagesScreen = ({ onProfile }: { onProfile: () => void }) => {
  const { user } = useApp();
  const student = user as Student;
  return (
    <View style={{ flex: 1 }}>
      <TopBar eyebrow="Birebir iletişim" title="Cem Hoca" name={student.fullName} onProfile={onProfile} />
      <ChatThread studentId={student.id} />
    </View>
  );
};


import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TravelChallengesFeature } from '../features/travel-challenges';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import { ChallengeView } from '../features/travel-challenges/ChallengeView';
import { sampleChallenges } from '../features/travel-challenges/data';

const TravelChallengesPage: React.FC = () => {
  const { t } = useLanguage();
  const { challengeId } = useParams<{ challengeId: string }>();
  
  // Set page title
  useEffect(() => {
    document.title = challengeId 
      ? `${t('challenge.view')} | ${t('travelChallenges.title')}` 
      : t('travelChallenges.title');
  }, [challengeId, t]);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {challengeId ? (
          <ChallengeView 
            challenge={sampleChallenges.find(c => c.id === challengeId) || sampleChallenges[0]} 
          />
        ) : (
          <TravelChallengesFeature />
        )}
      </div>
    </Layout>
  );
};

export default TravelChallengesPage;

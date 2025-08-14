import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MapPin, Mic, MicOff, Camera as CameraIcon, CameraOff, Wand2, Sparkles, Globe, Target, Clock, Trophy, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const needs = [
  { id: 'bonding', label: 'Family bonding', labelAr: 'التواصل العائلي' },
  { id: 'kids-energy', label: 'Kids have energy', labelAr: 'الأطفال لديهم طاقة' },
  { id: 'calm-evening', label: 'Calm evening', labelAr: 'مساء هادئ' },
  { id: 'learning', label: 'Learning & culture', labelAr: 'التعلم والثقافة' },
  { id: 'outdoor', label: 'Outdoor nearby', labelAr: 'أنشطة خارجية قريبة' },
  { id: 'adventure', label: 'Adventure & exploration', labelAr: 'المغامرة والاستكشاف' },
];

const ageGroups = [
  { value: 'kids', label: 'Kids', labelAr: 'أطفال' },
  { value: 'teens', label: 'Teens', labelAr: 'مراهقون' },
  { value: 'adults', label: 'Adults', labelAr: 'بالغون' },
  { value: 'mixed', label: 'Mixed', labelAr: 'مختلط' },
];

const middleEasternPresets = [
  { id: 'ramadan', label: 'Ramadan Activities', labelAr: 'أنشطة رمضان', need: 'bonding' },
  { id: 'eid', label: 'Eid Celebrations', labelAr: 'احتفالات العيد', need: 'bonding' },
  { id: 'arabic-calligraphy', label: 'Arabic Calligraphy', labelAr: 'الخط العربي', need: 'learning' },
  { id: 'middle-eastern-cooking', label: 'Middle Eastern Cooking', labelAr: 'الطبخ الشرق أوسطي', need: 'bonding' },
  { id: 'arabic-storytelling', label: 'Arabic Storytelling', labelAr: 'سرد القصص العربية', need: 'learning' },
  { id: 'desert-treasure-hunt', label: 'Desert Treasure Hunt', labelAr: 'مطاردة الكنز في الصحراء', need: 'adventure' },
];

type Recommendation = {
  id: string;
  title: string;
  description: string;
  activity_type: 'game' | 'challenge' | 'outing' | 'creative' | 'location_challenge';
  suggested_duration: string;
  location_required?: boolean;
  target_coordinates?: { lat: number; lon: number };
  points_reward?: number;
  verification_radius?: number;
};

type LocationChallenge = {
  game_session_id: string;
  challenge_name: string;
  target_location: string;
  target_latitude: number;
  target_longitude: number;
  challenge_type: string;
  points_reward: number;
  time_limit_minutes: number;
  verification_radius?: number;
  requirements?: Record<string, any>;
};

const ActivityCustomizer: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [need, setNeed] = useState<string>('bonding');
  const [ageGroup, setAgeGroup] = useState<string>('mixed');
  const [indoor, setIndoor] = useState<boolean>(false);
  const [useVoice, setUseVoice] = useState<boolean>(true); // Voice on by default
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [gameSessionId, setGameSessionId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Get geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => toast.error(isArabic ? 'تم رفض إذن الموقع' : 'Location permission denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [isArabic]);

  // Generate a simple game session ID for demo purposes
  useEffect(() => {
    setGameSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Camera control
  useEffect(() => {
    const setup = async () => {
      if (useCamera && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          mediaStreamRef.current = stream;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        } catch (e) {
          toast.error(isArabic ? 'فشل في الوصول للكاميرا' : 'Camera access failed');
          setUseCamera(false);
        }
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
      }
    };
    setup();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [useCamera, isArabic]);

  // Simple Web Speech API input (optional)
  const startVoice = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(isArabic ? 'الصوت غير مدعوم' : 'Voice not supported');
      setUseVoice(false);
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = isArabic ? 'ar-SA' : 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) setQuery(text);
    };
    recog.onerror = () => toast.error(isArabic ? 'خطأ في الصوت' : 'Voice error');
    recog.start();
  };

  const captureFrame = async () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return dataUrl;
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let visionContext: any = undefined;
      if (useCamera) {
        const frame = await captureFrame();
        visionContext = frame ? { frame } : undefined;
      }

      // For now, we'll generate mock recommendations since the endpoint doesn't exist yet
      // In the future, this would call: http://localhost:8000/api/activities/recommendations
      const mockRecommendations: Recommendation[] = [
        {
          id: '1',
          title: isArabic ? 'مطاردة الكنز في الحديقة' : 'Park Treasure Hunt',
          description: isArabic ? 'ابحث عن الكنوز المخفية في الحديقة المحلية' : 'Search for hidden treasures in the local park',
          activity_type: 'location_challenge',
          suggested_duration: '45 min',
          location_required: true,
          target_coordinates: coords ? { lat: coords.lat + 0.001, lon: coords.lon + 0.001 } : undefined,
          points_reward: 150,
          verification_radius: 50
        },
        {
          id: '2',
          title: isArabic ? 'لعبة المافيا العائلية' : 'Family Mafia Game',
          description: isArabic ? 'لعبة استراتيجية ممتعة للعائلة' : 'Fun strategic game for the family',
          activity_type: 'game',
          suggested_duration: '30 min'
        },
        {
          id: '3',
          title: isArabic ? 'رحلة استكشافية في الحي' : 'Neighborhood Exploration',
          description: isArabic ? 'اكتشف الأماكن الجديدة في حيك' : 'Discover new places in your neighborhood',
          activity_type: 'outing',
          suggested_duration: '60 min'
        },
        {
          id: '4',
          title: isArabic ? 'ورشة الخط العربي' : 'Arabic Calligraphy Workshop',
          description: isArabic ? 'تعلم فن الخط العربي الجميل' : 'Learn the beautiful art of Arabic calligraphy',
          activity_type: 'creative',
          suggested_duration: '90 min'
        }
      ];

      // Filter based on current settings
      let filteredRecs = mockRecommendations;
      if (indoor) {
        filteredRecs = filteredRecs.filter(r => r.activity_type !== 'outing');
      }
      if (need === 'adventure') {
        filteredRecs = filteredRecs.filter(r => r.activity_type === 'location_challenge' || r.activity_type === 'outing');
      }

      setRecs(filteredRecs);
    } catch (e) {
      toast.error(isArabic ? 'لا يمكن الحصول على التوصيات' : 'Could not get recommendations');
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  const createLocationChallenge = async (rec: Recommendation) => {
    if (!rec.target_coordinates || !coords) {
      toast.error(isArabic ? 'مطلوب موقع للبدء في التحدي' : 'Location required to start challenge');
      return;
    }

    setCreatingChallenge(true);
    try {
      const challengeData: LocationChallenge = {
        game_session_id: gameSessionId,
        challenge_name: rec.title,
        target_location: `${rec.target_coordinates.lat.toFixed(6)}, ${rec.target_coordinates.lon.toFixed(6)}`,
        target_latitude: rec.target_coordinates.lat,
        target_longitude: rec.target_coordinates.lon,
        challenge_type: 'reach_point',
        points_reward: rec.points_reward || 100,
        time_limit_minutes: 60,
        verification_radius: rec.verification_radius || 50,
        requirements: {
          family_size: 'mixed',
          age_group: ageGroup,
          indoor: indoor
        }
      };

      const response = await fetch('http://localhost:8000/api/games/location/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challengeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      toast.success(isArabic ? 'تم إنشاء التحدي!' : 'Challenge created!', {
        description: isArabic ? `انتقل إلى الموقع المحدد للفوز بـ ${rec.points_reward} نقطة` : `Go to the target location to win ${rec.points_reward} points`
      });

      // Navigate to gaming page to show active challenges
      window.location.href = '/gaming';
    } catch (error) {
      console.error('Failed to create challenge:', error);
      toast.error(isArabic ? 'فشل في إنشاء التحدي' : 'Failed to create challenge');
    } finally {
      setCreatingChallenge(false);
    }
  };

  const startRecommended = (rec: Recommendation) => {
    if (rec.activity_type === 'location_challenge') {
      createLocationChallenge(rec);
      return;
    }
    
    if (rec.activity_type === 'game') {
      window.location.href = '/gaming';
      return;
    }
    
    toast.success(isArabic ? 'النشاط جاهز' : 'Activity ready', { description: rec.title });
  };

  const applyPreset = (preset: typeof middleEasternPresets[0]) => {
    setNeed(preset.need);
    setQuery(preset.label);
    toast.success(isArabic ? 'تم تطبيق النشاط' : 'Preset applied', { description: preset.label });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background to-muted/30 p-6 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              {isArabic ? 'مخطط الأنشطة السياقية' : 'Contextual Activity Planner'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Middle Eastern Presets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                {isArabic ? 'أنشطة شرق أوسطية سريعة:' : 'Quick Middle Eastern Activities:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {middleEasternPresets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {isArabic ? preset.labelAr : preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'احتياج العائلة' : 'Family need'}
                </div>
                <Select value={need} onValueChange={setNeed}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر الاحتياج' : 'Select need'} />
                  </SelectTrigger>
                  <SelectContent>
                    {needs.map(n => (
                      <SelectItem key={n.id} value={n.id}>
                        {isArabic ? n.labelAr : n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'الفئة العمرية' : 'Age group'}
                </div>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? 'اختر الفئة العمرية' : 'Select age group'} />
                  </SelectTrigger>
                  <SelectContent>
                    {ageGroups.map(ag => (
                      <SelectItem key={ag.value} value={ag.value}>
                        {isArabic ? ag.labelAr : ag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'نص حر (اختياري)' : 'Free text (optional)'}
                </div>
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder={isArabic ? 'مثل: شقة صغيرة، 60 دقيقة' : 'e.g., small apartment, 60 mins'} 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{isArabic ? 'استخدم الموقع' : 'Use location'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : (isArabic ? 'إيقاف' : 'Off')}
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {useVoice ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{isArabic ? 'إدخال الصوت' : 'Voice input'}</span>
                </div>
                <Switch 
                  checked={useVoice} 
                  onCheckedChange={(v) => { 
                    setUseVoice(v); 
                    if (v) startVoice(); 
                  }} 
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {useCamera ? <CameraIcon className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  <span>{isArabic ? 'سياق الكاميرا' : 'Camera context'}</span>
                </div>
                <Switch checked={useCamera} onCheckedChange={setUseCamera} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border rounded-lg p-3">
                <span>{isArabic ? 'الوضع الداخلي' : 'Indoor mode'}</span>
                <Switch checked={indoor} onCheckedChange={setIndoor} />
              </div>
              <Button onClick={fetchRecommendations} disabled={loading}>
                {loading ? (isArabic ? 'جاري البحث...' : 'Finding...') : (isArabic ? 'ابحث عن الأنشطة' : 'Find activities')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {useCamera && (
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'معاينة الكاميرا (للسياق)' : 'Camera preview (for context)'}</CardTitle>
            </CardHeader>
            <CardContent>
              <video ref={videoRef} className="w-full rounded-lg border" muted playsInline />
            </CardContent>
          </Card>
        )}

        {recs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {isArabic ? 'الاقتراحات' : 'Suggestions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recs.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        {r.activity_type === 'location_challenge' && <Target className="w-3 h-3" />}
                        {r.activity_type === 'game' && <Users className="w-3 h-3" />}
                        {r.activity_type === 'outing' && <MapPin className="w-3 h-3" />}
                        {r.activity_type === 'creative' && <Wand2 className="w-3 h-3" />}
                        <span className="uppercase">{r.activity_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{r.suggested_duration}</span>
                      </div>
                      {r.points_reward && (
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          <span>{r.points_reward} pts</span>
                        </div>
                      )}
                    </div>
                    <div className="font-semibold mb-1">{r.title}</div>
                    <div className="text-sm text-muted-foreground mb-3">{r.description}</div>
                    <Button 
                      onClick={() => startRecommended(r)} 
                      size="sm"
                      disabled={creatingChallenge && r.activity_type === 'location_challenge'}
                    >
                      {creatingChallenge && r.activity_type === 'location_challenge' 
                        ? (isArabic ? 'جاري الإنشاء...' : 'Creating...')
                        : (isArabic ? 'ابدأ' : 'Start')
                      }
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivityCustomizer;



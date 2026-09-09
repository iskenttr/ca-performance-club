import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Ellipse, G, Line } from 'react-native-svg';
import { AppText } from './ui';

type Group = 'chest' | 'shoulders' | 'arms' | 'back' | 'core' | 'glutes' | 'quads' | 'hamstrings' | 'calves';
type Load = { group: Group; count: number; intensity: number; exercises: string[] };
const labels: Record<Group, string> = { chest: 'Göğüs', shoulders: 'Omuz', arms: 'Kol', back: 'Sırt', core: 'Karın / core', glutes: 'Kalça', quads: 'Ön bacak', hamstrings: 'Arka bacak', calves: 'Baldır' };
const descriptions: Record<Group, string> = {
  chest: 'Pektoral kaslar · İtiş hareketlerinde görev alır.', shoulders: 'Deltoid kaslar · Kolu kaldırmaya ve omuzu kontrol etmeye yardımcı olur.',
  arms: 'Biseps, triseps ve ön kol · Dirsek hareketi ve kavrama.', back: 'Trapez ve latissimus · Çekiş ve kürek kemiği kontrolü.',
  core: 'Karın ve oblik kaslar · Gövdenin dengesi ve kontrolü.', glutes: 'Gluteal kaslar · Kalçayı açma ve pelvis kontrolü.',
  quads: 'Quadriceps · Dizi düzleştiren ön uyluk kasları.', hamstrings: 'Hamstring grubu · Dizi bükme ve kalçayı açma.', calves: 'Gastroknemius ve soleus · Ayak bileği hareketi.',
};
const front: Partial<Record<Group, string[]>> = {
  chest: ['M99 94 Q78 89 65 109 L69 132 Q83 142 98 127 Z'],
  shoulders: ['M65 96 Q48 98 43 123 L57 132 Q62 118 69 111 Z'],
  arms: ['M43 128 Q35 144 35 167 L46 177 Q57 157 56 135 Z', 'M34 174 L23 211 L28 237 L37 211 L45 180 Z'],
  core: ['M97 136 L84 143 L85 161 L97 161 Z', 'M97 165 L85 165 L86 182 L97 182 Z', 'M97 186 L86 186 L91 207 L97 215 Z', 'M73 143 L81 148 L83 187 L89 211 L74 195 L68 164 Z'],
  quads: ['M73 216 Q59 236 62 268 L73 303 L83 289 L88 241 Z', 'M88 240 L85 284 L78 303 L89 310 L96 275 L97 228 Z'],
  calves: ['M69 322 Q62 344 71 377 L78 401 L84 396 L82 354 L79 324 Z'],
};
const back: Partial<Record<Group, string[]>> = {
  back: ['M98 75 L86 89 L66 99 L82 117 L98 143 Z', 'M66 119 L79 128 L97 149 L97 200 L83 187 L70 154 Z', 'M96 154 L88 185 L94 211 L98 211 Z'],
  shoulders: ['M64 98 Q48 102 43 126 L57 134 L70 114 Z'],
  arms: ['M43 131 Q36 146 36 170 L46 177 L56 139 Z', 'M34 176 L23 211 L28 237 L38 208 L45 180 Z'],
  glutes: ['M95 207 Q77 199 66 221 L65 244 Q83 252 98 235 L98 213 Z'],
  hamstrings: ['M66 250 L65 281 L75 310 L83 306 L87 262 L95 244 L85 251 Z', 'M94 252 L88 295 L88 314 L96 291 L99 248 Z'],
  calves: ['M73 323 Q62 338 69 361 L78 381 L84 357 L82 327 Z', 'M87 322 L86 353 L81 382 L87 393 L93 355 L93 327 Z'],
};
const outline = 'M89 69 L87 86 L65 94 Q45 95 39 119 L31 166 L18 211 L19 239 L25 249 L31 246 L32 225 L46 189 L57 155 L62 180 L62 204 L56 239 L58 277 L66 312 L62 343 L72 399 L69 421 L59 431 Q67 440 87 432 L91 413 L88 391 L98 335 L100 279 L102 335 L112 391 L109 413 L113 432 Q133 440 141 431 L131 421 L128 399 L138 343 L134 312 L142 277 L144 239 L138 204 L138 180 L143 155 L154 189 L168 225 L169 246 L175 249 L181 239 L182 211 L169 166 L161 119 Q155 95 135 94 L113 86 L111 69 Z';

export const AnatomyMap = ({ load }: { load: Load[] }) => {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<Group | null>(null);
  const muscles = side === 'front' ? front : back;
  const current = selected ?? load.find((item) => muscles[item.group])?.group ?? 'core';
  const currentLoad = load.find((item) => item.group === current);
  return <View style={s.root}>
    <View style={s.tabs}>{(['front', 'back'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: side === value }} onPress={() => { setSide(value); setSelected(null); }} style={[s.tab, side === value && s.tabActive]}><AppText style={[s.tabText, side === value && s.tabTextActive]}>{value === 'front' ? 'Ön görünüm' : 'Arka görünüm'}</AppText></Pressable>)}</View>
    <View style={s.stage}>
      <Svg width="100%" height={440} viewBox="0 0 260 470" accessibilityLabel={side === 'front' ? 'Önden kas grupları' : 'Arkadan kas grupları'}>
        <Defs><LinearGradient id="anatomyBody" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#172C32"/><Stop offset="0.5" stopColor="#304950"/><Stop offset="1" stopColor="#172C32"/></LinearGradient><LinearGradient id="anatomyActive" x1="0" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor="#E3FF89"/><Stop offset="1" stopColor="#5ABF86"/></LinearGradient></Defs>
        {[110, 210, 310, 410].map((y) => <Line key={y} x1="10" x2="250" y1={y} y2={y} stroke="#183039" strokeDasharray="3 7"/>)}
        <Ellipse cx="130" cy="448" rx="55" ry="8" fill="#153038"/>
        <G transform="translate(30 0)">
          <Path d={outline} fill="url(#anatomyBody)" stroke="#58727A" strokeWidth={1.1}/>
          <Ellipse cx="100" cy="45" rx="22" ry="28" fill="url(#anatomyBody)" stroke="#58727A" strokeWidth={1.1}/>
          <Path d="M91 72 L96 88 M109 72 L104 88 M100 96 L100 215 M67 314 Q77 320 89 315 M111 315 Q123 320 133 314" fill="none" stroke="#6E8587" strokeWidth={0.8}/>
          {(Object.entries(muscles) as [Group, string[]][]).map(([group, paths]) => {
            const active = load.some((item) => item.group === group);
            return <G key={group} onPress={() => setSelected(group)}>{[false, true].map((mirror) => <G key={String(mirror)} transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>{paths.map((d, index) => <Path key={index} d={d} fill={active ? 'url(#anatomyActive)' : '#344F57'} fillOpacity={selected && current !== group ? 0.42 : 1} stroke={current === group ? '#F2FFC7' : '#0B2027'} strokeWidth={current === group ? 1.8 : 1.1}/>)}</G>)}</G>;
          })}
        </G>
      </Svg>
    </View>
    <View style={s.legend}><View style={s.dot}/><AppText style={s.note}>Programda yer alan bölge</AppText><View style={[s.dot, { backgroundColor: '#344F57' }]}/><AppText style={s.note}>Diğer bölgeler</AppText></View>
    <View style={s.regions}>{(Object.keys(muscles) as Group[]).map((group) => <Pressable key={group} accessibilityRole="button" accessibilityState={{ selected: current === group }} onPress={() => setSelected(group)} style={[s.region, current === group && s.regionActive]}><AppText style={s.regionText}>{labels[group]}</AppText></Pressable>)}</View>
    <View style={s.detail}><AppText style={s.title}>{labels[current]}</AppText><AppText style={s.description}>{descriptions[current]}</AppText><AppText style={s.count}>{currentLoad ? `${currentLoad.count} hareket bu bölgeyle ilişkili` : 'Bu antrenmanda eşleşen hareket yok'}</AppText>{currentLoad?.exercises.map((name, index) => <AppText key={`${index}-${name}`} style={s.description}>• {name}</AppText>)}</View>
    <AppText style={s.footnote}>Bir bölge seçerek incele. Renklendirme hareketlere göre hazırlanmış şematik bir gösterimdir; ölçülmüş kas aktivasyonu değildir.</AppText>
  </View>;
};
const s = StyleSheet.create({
  root: { backgroundColor: '#09171E', padding: 16, gap: 14 }, tabs: { flexDirection: 'row', backgroundColor: '#14262E', borderRadius: 14, padding: 4 }, tab: { flex: 1, alignItems: 'center', padding: 11, borderRadius: 10 }, tabActive: { backgroundColor: '#D7F790' }, tabText: { color: '#A5BDC7', fontSize: 13, fontWeight: '700' }, tabTextActive: { color: '#13271E' }, stage: { alignItems: 'center' }, legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C7EF8A' }, note: { color: '#A9BFC8', fontSize: 11, marginRight: 6 }, regions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, region: { borderWidth: 1, borderColor: '#304953', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, regionActive: { borderColor: '#D7F790', backgroundColor: '#203C35' }, regionText: { color: '#E3EEF0', fontSize: 12 }, detail: { backgroundColor: '#142932', borderRadius: 16, padding: 16, gap: 6, borderLeftWidth: 3, borderLeftColor: '#D7F790' }, title: { color: '#F0F6F4', fontSize: 20, fontWeight: '800' }, description: { color: '#C3D3D8', fontSize: 13, lineHeight: 20 }, count: { color: '#D7F790', fontSize: 12, marginTop: 4 }, footnote: { color: '#91AAB5', fontSize: 11, lineHeight: 17 },
});

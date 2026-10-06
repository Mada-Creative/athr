import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import AppText from './AppText';

// A line chart for "مسار الإنجاز اليومي" — the day-by-day weighted score
// over the most recent stretch (see `dailySeries` in GET /stats/overview).
// No charting library in this project yet beyond react-native-svg itself,
// so this draws its own path rather than pulling one in for a single
// chart. The "drawing in" effect animates a plain 0→1 JS value and
// re-slices how many of the already-laid-out points go into the path on
// each frame — simpler to get right than animating `strokeDashoffset` on
// a `Path` this irregular (unlike ProgressRing's perfect circle).
export default function DailyProgressChart({ data, height = 180 }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const [drawProgress, setDrawProgress] = useState(0);

  useEffect(() => {
    progress.setValue(0);
    const id = progress.addListener(({ value }) => setDrawProgress(value));
    Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: false }).start();
    return () => progress.removeListener(id);
  }, [data, progress]);

  const hasEnoughData = data && data.length >= 2;

  if (!hasEnoughData || width === 0) {
    return (
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && !hasEnoughData ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText size={12.5} color={colors.inkFaint}>
              لسا ما في بيانات كافية لرسم المسار
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  const padX = 8;
  const padTop = 14;
  const padBottom = 22;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  // Points left-to-right in SVG space, oldest day first — a time-series
  // line still reads left=earlier/right=most-recent like any chart, even
  // on an otherwise-RTL page.
  const stepX = chartW / (data.length - 1);
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + chartH - (d.percentage / 100) * chartH,
    percentage: d.percentage,
    date: d.date,
  }));

  const visibleCount = Math.max(2, Math.round(points.length * drawProgress));
  const visible = points.slice(0, visibleCount);

  const linePath = visible.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${visible[visible.length - 1].x} ${padTop + chartH} L ${visible[0].x} ${padTop + chartH} Z`;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {gridLines.map((pct) => {
          const y = padTop + chartH - (pct / 100) * chartH;
          return <Line key={pct} x1={padX} y1={y} x2={width - padX} y2={y} stroke={colors.border} strokeWidth={1} />;
        })}
        <Path d={areaPath} fill={colors.amber} fillOpacity={0.12} stroke="none" />
        <Path d={linePath} fill="none" stroke={colors.amber} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {visibleCount === points.length
          ? points.map((p, i) => (
              <Circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={i === points.length - 1 ? 4 : 2.5}
                fill={colors.amber}
                stroke={colors.surface}
                strokeWidth={1.5}
              />
            ))
          : null}
      </Svg>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: padX,
          right: padX,
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
        }}
      >
        <AppText size={9.5} color={colors.inkFaint}>
          {formatShort(data[0].date)}
        </AppText>
        <AppText size={9.5} color={colors.inkFaint}>
          {formatShort(data[data.length - 1].date)}
        </AppText>
      </View>
    </View>
  );
}

function formatShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

import type { SignalTone } from '@/lib/technical/signals'
import { cn } from '../ui/utils'

/**
 * 条件の方向。緑=上昇方向の動きと結び付けて語られる条件、赤=下落方向、黄=中立・注意。
 * 売買の判断ではないので、色の意味は凡例とツールチップで必ず文字でも示す。
 */
export const TONE_LABEL: Record<SignalTone, string> = {
  up: '上昇方向の条件',
  down: '下落方向の条件',
  neutral: '中立・注意',
}

export function ToneDot({ tone, className }: { tone: SignalTone; className?: string }) {
  return (
    <span
      className={cn('inline-block size-2.5 shrink-0 rounded-full', tone === 'up' ? 'bg-up' : tone === 'down' ? 'bg-down' : 'bg-neutral', className)}
      role="img"
      aria-label={TONE_LABEL[tone]}
      title={TONE_LABEL[tone]}
    />
  )
}

export function ToneLegend({ className }: { className?: string }) {
  return (
    <p className={cn('flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground', className)}>
      {(['up', 'down', 'neutral'] as const).map((t) => (
        <span key={t} className="inline-flex items-center gap-1">
          <ToneDot tone={t} />
          {TONE_LABEL[t]}
        </span>
      ))}
    </p>
  )
}

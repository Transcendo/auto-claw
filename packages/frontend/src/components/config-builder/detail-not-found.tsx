import { DetailPageShell } from './detail-page-shell'

type DetailNotFoundProps = {
  title: string
  description: string
  backLabel: string
  onBack: () => void
}

export function DetailNotFound({
  title,
  description,
  backLabel,
  onBack,
}: DetailNotFoundProps) {
  return (
    <DetailPageShell
      title={title}
      description={description}
      backLabel={backLabel}
      onBack={onBack}
    >
      <div className='rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground'>
        {description}
      </div>
    </DetailPageShell>
  )
}

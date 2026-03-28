import { createFileRoute } from '@tanstack/react-router'
import { SkillsPage } from '@/features/openclaw/skills-page'

export const Route = createFileRoute('/_authenticated/skills')({
  component: SkillsPage,
})

import { useState, useEffect } from 'react'
import SurveyModal from '@/components/ui/SurveyModal'
import { SURVEY_DONE_KEY } from '@/lib/survey-questions'

export default function SurveyTrigger() {
  const [completed, setCompleted] = useState(true) // start hidden to avoid flicker
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setCompleted(localStorage.getItem(SURVEY_DONE_KEY) === '1')
  }, [])

  if (completed) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-block cursor-pointer text-primary-400 hover:text-accent-400 transition-colors duration-200 mx-0.5"
      >
        Survey
      </button>
      <SurveyModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={() => setCompleted(true)}
      />
    </>
  )
}

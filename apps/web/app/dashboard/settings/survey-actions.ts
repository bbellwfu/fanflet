'use server'

import { revalidatePath } from 'next/cache'
import { requireSpeaker } from '@/lib/auth-context'
import { getSpeakerEntitlements } from '@fanflet/db'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function listSurveyQuestions(): Promise<{
  data?: { id: string; question_text: string; question_type: string; is_default: boolean; created_at: string }[]
  error?: string
}> {
  const { speakerId, supabase } = await requireSpeaker()

  const { data, error } = await supabase
    .from('survey_questions')
    .select('id, question_text, question_type, is_default, created_at')
    .eq('speaker_id', speakerId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export async function createSurveyQuestion(
  questionText: string,
  questionType: string
): Promise<{ error?: string; success?: boolean; id?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  if (!questionText.trim()) return { error: 'Question text is required' }
  if (!['nps', 'yes_no', 'rating'].includes(questionType)) {
    return { error: 'Invalid question type' }
  }
  const canCreateSurveys = (await getSpeakerEntitlements(speakerId)).features.has('surveys_session_feedback')
  if (!canCreateSurveys) return { error: 'Survey questions require a higher plan. Upgrade in Settings.' }

  const { data, error } = await supabase
    .from('survey_questions')
    .insert({
      speaker_id: speakerId,
      question_text: questionText.trim(),
      question_type: questionType,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'createSurveyQuestion', speaker_id: speakerId, id: data.id })
  revalidatePath('/dashboard/settings')
  return { success: true, id: data.id }
}

export async function updateSurveyQuestion(
  questionId: string,
  questionText: string,
  questionType: string
): Promise<{ error?: string; success?: boolean }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  if (!questionText.trim()) return { error: 'Question text is required' }

  const { error } = await supabase
    .from('survey_questions')
    .update({
      question_text: questionText.trim(),
      question_type: questionType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'updateSurveyQuestion', speaker_id: speakerId, questionId })
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteSurveyQuestion(
  questionId: string
): Promise<{ error?: string; success?: boolean }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  const { error } = await supabase
    .from('survey_questions')
    .delete()
    .eq('id', questionId)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'deleteSurveyQuestion', speaker_id: speakerId, questionId })
  revalidatePath('/dashboard/settings')
  return { success: true }
}

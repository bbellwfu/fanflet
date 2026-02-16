'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getSpeakerId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  return speaker?.id ?? null
}

export async function listSurveyQuestions(): Promise<{
  data?: { id: string; question_text: string; question_type: string; is_default: boolean; created_at: string }[]
  error?: string
}> {
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

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
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

  if (!questionText.trim()) return { error: 'Question text is required' }
  if (!['nps', 'yes_no', 'rating'].includes(questionType)) {
    return { error: 'Invalid question type' }
  }

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

  revalidatePath('/dashboard/settings')
  return { success: true, id: data.id }
}

export async function updateSurveyQuestion(
  questionId: string,
  questionText: string,
  questionType: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

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

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteSurveyQuestion(
  questionId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('survey_questions')
    .delete()
    .eq('id', questionId)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

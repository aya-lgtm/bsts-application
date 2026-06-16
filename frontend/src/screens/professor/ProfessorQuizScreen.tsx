import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as SecureStore from 'expo-secure-store'
import api from '../../services/auth.service'

// ─── Palette alignée sur ProfessorProfilScreen ────────────────────────────
const C = {
  primary:       '#0D6B5E',
  primaryLight:  '#E8F5F3',
  bg:            '#F5F7F6',
  white:         '#FFFFFF',
  text:          '#1A1A1A',
  textSub:       '#888888',
  border:        '#F0F0F0',
  borderStrong:  '#E0E0E0',
  success:       '#10B981',
  orange:        '#F97316',
  danger:        '#E53935',
  blue:          '#3B82F6',
  purple:        '#7C3AED',
}

const DOMAINES = [
  { key: 'MATH',    label: 'Math',    icon: 'calculator-outline', color: C.primary },
  { key: 'READING', label: 'Reading', icon: 'book-outline',       color: C.blue    },
  { key: 'WRITING', label: 'Writing', icon: 'create-outline',     color: C.purple  },
]

const DIFFICULTES = [
  { key: 'EASY',   label: 'Easy',   color: C.success },
  { key: 'MEDIUM', label: 'Medium', color: C.orange  },
  { key: 'HARD',   label: 'Hard',   color: C.danger  },
]

interface Quiz {
  id: string
  titre: string
  domaine: string
  difficulte: string
  scoreMinimum: number
  totalQuestions: number
  createdAt: string
}

interface Question {
  id: string
  enonce: string
  choixA: string
  choixB: string
  choixC?: string
  choixD?: string
  bonneReponse: 'A' | 'B' | 'C' | 'D'
  explication?: string
  explicationIncorrecte?: string
  difficulte?: string
  ordre: number
}

interface NewQuestion {
  enonce: string
  choixA: string
  choixB: string
  choixC: string
  choixD: string
  bonneReponse: 'A' | 'B' | 'C' | 'D'
  explication: string
  explicationIncorrecte: string
  difficulte: string
  ordre: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function getDomaineInfo(key: string)   { return DOMAINES.find(d => d.key === key)   ?? DOMAINES[0] }
function getDifficulteInfo(key: string){ return DIFFICULTES.find(d => d.key === key) ?? DIFFICULTES[0] }

// ─── Sélecteurs ───────────────────────────────────────────────────────────
function DomainePicker({ value, onChange, matieres, label }: {
  value: string; onChange: (v: string) => void; matieres: string[]; label?: string
}) {
  const available = matieres.length > 0 ? DOMAINES.filter(d => matieres.includes(d.key)) : DOMAINES
  return (
    <View>
      {label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={s.pickerRow}>
        {available.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[s.pickerChip, value === d.key && { backgroundColor: d.color, borderColor: d.color }]}
            onPress={() => onChange(d.key)}
          >
            <Ionicons name={d.icon as any} size={14} color={value === d.key ? C.white : d.color} />
            <Text style={[s.pickerChipText, { color: value === d.key ? C.white : d.color }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function DifficultyPicker({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label?: string
}) {
  return (
    <View>
      {label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={s.pickerRow}>
        {DIFFICULTES.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[s.pickerChip, value === d.key && { backgroundColor: d.color, borderColor: d.color }]}
            onPress={() => onChange(d.key)}
          >
            <Text style={[s.pickerChipText, { color: value === d.key ? C.white : d.color }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─── Quiz Card — style Profil ─────────────────────────────────────────────
function QuizCard({ quiz, onPress }: { quiz: Quiz; onPress: () => void }) {
  const dom  = getDomaineInfo(quiz.domaine)
  const diff = getDifficulteInfo(quiz.difficulte)
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      {/* Icône domaine */}
      <View style={[s.cardIconBox, { backgroundColor: dom.color + '15' }]}>
        <Ionicons name={dom.icon as any} size={22} color={dom.color} />
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>{quiz.titre}</Text>

        {/* Badges */}
        <View style={s.cardBadges}>
          <View style={[s.badge, { backgroundColor: dom.color + '15' }]}>
            <Text style={[s.badgeText, { color: dom.color }]}>{dom.label}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: diff.color + '15' }]}>
            <Text style={[s.badgeText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>

        {/* Méta */}
        <View style={s.cardMeta}>
          <View style={s.cardMetaItem}>
            <Ionicons name="help-circle-outline" size={12} color={C.textSub} />
            <Text style={s.cardMetaText}>{quiz.totalQuestions} questions</Text>
          </View>
          <View style={s.cardMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={C.textSub} />
            <Text style={s.cardMetaText}>{formatDate(quiz.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Score */}
      <View style={s.scoreBox}>
        <Text style={s.scoreValue}>{quiz.scoreMinimum}%</Text>
        <Text style={s.scoreLabel}>min</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Modal Créer Quiz ─────────────────────────────────────────────────────
function CreateQuizModal({ visible, onClose, onCreated, matieres }: {
  visible: boolean; onClose: () => void; onCreated: () => void; matieres: string[]
}) {
  const defaultDomaine = matieres.length === 1 ? matieres[0] : (matieres[0] ?? 'MATH')
  const [form, setForm] = useState({ titre: '', domaine: defaultDomaine, difficulte: 'MEDIUM', scoreMinimum: '70' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) { setForm({ titre: '', domaine: defaultDomaine, difficulte: 'MEDIUM', scoreMinimum: '70' }); setError('') }
  }, [visible, defaultDomaine])

  const handleCreate = async () => {
    setError('')
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return }
    const score = parseInt(form.scoreMinimum)
    if (isNaN(score) || score < 0 || score > 100) { setError('Score entre 0 et 100.'); return }
    try {
      setLoading(true)
      await api.post('/quiz/', { titre: form.titre.trim(), domaine: form.domaine, difficulte: form.difficulte, scoreMinimum: score })
      onClose()
      setTimeout(() => onCreated(), 300)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur lors de la création.')
    } finally { setLoading(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Créer un quiz SAT</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            {error ? <View style={s.errorBanner}><Text style={s.errorBannerText}>{error}</Text></View> : null}
            <Text style={s.inputLabel}>Titre *</Text>
            <TextInput style={s.input} placeholder="Ex: Quiz Math — Algèbre" placeholderTextColor={C.textSub}
              value={form.titre} onChangeText={v => setForm(f => ({ ...f, titre: v }))} />
            <DomainePicker
              label={matieres.length === 1 ? `Matière (${getDomaineInfo(matieres[0]).label})` : 'Matière *'}
              value={form.domaine} onChange={v => setForm(f => ({ ...f, domaine: v }))} matieres={matieres}
            />
            <DifficultyPicker label="Difficulté *" value={form.difficulte} onChange={v => setForm(f => ({ ...f, difficulte: v }))} />
            <Text style={s.inputLabel}>Score minimum (%)</Text>
            <TextInput style={s.input} placeholder="70" placeholderTextColor={C.textSub}
              value={form.scoreMinimum} onChangeText={v => setForm(f => ({ ...f, scoreMinimum: v }))} keyboardType="numeric" />
            <View style={{ height: 20 }} />
          </ScrollView>
          <TouchableOpacity style={[s.modalBtn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.modalBtnText}>Créer le quiz</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Form Question ────────────────────────────────────────────────────────
function QuestionForm({ initial, onSubmit, onCancel, loading, submitLabel, quizDifficulte }: {
  initial: NewQuestion; onSubmit: (q: NewQuestion) => void; onCancel: () => void
  loading: boolean; submitLabel: string; quizDifficulte: string
}) {
  const [q, setQ] = useState<NewQuestion>(initial)
  const [error, setError] = useState('')

  useEffect(() => { setQ(initial); setError('') }, [initial])

  const handleSubmit = () => {
    setError('')
    if (!q.enonce.trim()) { setError("L'énoncé est obligatoire."); return }
    if (!q.choixA.trim()) { setError("Le choix A est obligatoire."); return }
    if (!q.choixB.trim()) { setError("Le choix B est obligatoire."); return }
    onSubmit(q)
  }

  return (
    <View style={{ gap: 4 }}>
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={s.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Text style={s.inputLabel}>Énoncé *</Text>
      <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
        placeholder="Quelle est la valeur de x si 2x + 4 = 10 ?" placeholderTextColor={C.textSub}
        value={q.enonce} onChangeText={v => setQ(p => ({ ...p, enonce: v }))} multiline />

      {(['A', 'B', 'C', 'D'] as const).map(letter => (
        <View key={letter}>
          <Text style={s.inputLabel}>Choix {letter}{letter === 'A' || letter === 'B' ? ' *' : ' (optionnel)'}</Text>
          <TextInput style={s.input} placeholder={`Option ${letter}`} placeholderTextColor={C.textSub}
            value={(q as any)[`choix${letter}`]}
            onChangeText={v => setQ(p => ({ ...p, [`choix${letter}`]: v }))} />
        </View>
      ))}

      <Text style={s.inputLabel}>Bonne réponse *</Text>
      <View style={s.reponseRow}>
        {(['A', 'B', 'C', 'D'] as const).map(letter => (
          <TouchableOpacity key={letter}
            style={[s.reponseBtn, q.bonneReponse === letter && s.reponseBtnActive]}
            onPress={() => setQ(p => ({ ...p, bonneReponse: letter }))}>
            <Ionicons name={q.bonneReponse === letter ? 'checkmark-circle' : 'ellipse-outline'}
              size={14} color={q.bonneReponse === letter ? C.white : C.textSub} />
            <Text style={[s.reponseBtnText, q.bonneReponse === letter && s.reponseBtnTextActive]}>{letter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.explainHeader}>
        <Ionicons name="checkmark-circle-outline" size={15} color={C.success} />
        <Text style={[s.inputLabel, { color: C.success, marginTop: 0 }]}>Explication — Bonne réponse ✅</Text>
      </View>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top', borderColor: C.success + '60' }]}
        placeholder="Pourquoi cette réponse est correcte..." placeholderTextColor={C.textSub}
        value={q.explication} onChangeText={v => setQ(p => ({ ...p, explication: v }))} multiline />

      <View style={s.explainHeader}>
        <Ionicons name="close-circle-outline" size={15} color={C.danger} />
        <Text style={[s.inputLabel, { color: C.danger, marginTop: 0 }]}>Explication — Mauvaise réponse ❌</Text>
      </View>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top', borderColor: C.danger + '60' }]}
        placeholder="Ce que l'étudiant a mal compris..." placeholderTextColor={C.textSub}
        value={q.explicationIncorrecte} onChangeText={v => setQ(p => ({ ...p, explicationIncorrecte: v }))} multiline />

      <DifficultyPicker label="Difficulté de cette question" value={q.difficulte} onChange={v => setQ(p => ({ ...p, difficulte: v }))} />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.modalBtn, { flex: 1, marginHorizontal: 0 }, loading && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.modalBtnText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Modal Détail Quiz ────────────────────────────────────────────────────
function QuizDetailModal({ quiz, onClose, onUpdated, onDeleted, matieres }: {
  quiz: Quiz; onClose: () => void; onUpdated: () => void; onDeleted: () => void; matieres: string[]
}) {
  type Tab = 'info' | 'questions' | 'ajouter'
  const [tab,       setTab]       = useState<Tab>('info')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQ,  setLoadingQ]  = useState(false)
  const [loadingOp, setLoadingOp] = useState(false)
  const [editingQ,  setEditingQ]  = useState<Question | null>(null)

  const dom  = getDomaineInfo(quiz.domaine)
  const diff = getDifficulteInfo(quiz.difficulte)

  const emptyQ: NewQuestion = {
    enonce: '', choixA: '', choixB: '', choixC: '', choixD: '',
    bonneReponse: 'A', explication: '', explicationIncorrecte: '',
    difficulte: quiz.difficulte ?? 'MEDIUM',
    ordre: String(questions.length + 1),
  }

  const fetchQuestions = useCallback(async () => {
    setLoadingQ(true)
    try {
      const res = await api.get(`/quiz/${quiz.id}/questions`)
      setQuestions(res.data?.questions ?? [])
    } catch (e) { console.warn('fetchQuestions error:', e) }
    finally { setLoadingQ(false) }
  }, [quiz.id])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const handleAdd = async (q: NewQuestion) => {
    if (questions.length >= 10) { Alert.alert('Maximum', '10 questions max par quiz.'); return }
    setLoadingOp(true)
    try {
      await api.post(`/quiz/${quiz.id}/questions`, {
        enonce: q.enonce.trim(), choixA: q.choixA.trim(), choixB: q.choixB.trim(),
        choixC: q.choixC.trim() || null, choixD: q.choixD.trim() || null,
        bonneReponse: q.bonneReponse,
        explication: q.explication.trim() || null,
        explicationIncorrecte: q.explicationIncorrecte.trim() || null,
        difficulte: q.difficulte,
        ordre: parseInt(q.ordre) || questions.length + 1,
      })
      Alert.alert('✅', `Question ${questions.length + 1}/10 ajoutée`)
      await fetchQuestions(); onUpdated(); setTab('questions')
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'ajouter la question.")
    } finally { setLoadingOp(false) }
  }

  const handleUpdate = async (q: NewQuestion) => {
    if (!editingQ) return
    setLoadingOp(true)
    try {
      await api.put(`/quiz/questions/${editingQ.id}`, {
        enonce: q.enonce.trim(), choixA: q.choixA.trim(), choixB: q.choixB.trim(),
        choixC: q.choixC.trim() || null, choixD: q.choixD.trim() || null,
        bonneReponse: q.bonneReponse,
        explication: q.explication.trim() || null,
        explicationIncorrecte: q.explicationIncorrecte.trim() || null,
        difficulte: q.difficulte,
        ordre: parseInt(q.ordre) || editingQ.ordre,
      })
      Alert.alert('✅', 'Question mise à jour !')
      setEditingQ(null); await fetchQuestions(); onUpdated(); setTab('questions')
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de modifier.')
    } finally { setLoadingOp(false) }
  }

  const handleDeleteQ = (qId: string, index: number) => {
    Alert.alert('Supprimer la question', `Supprimer la question ${index + 1} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.delete(`/quiz/questions/${qId}`); await fetchQuestions(); onUpdated() }
        catch { Alert.alert('Erreur', 'Impossible de supprimer.') }
      }},
    ])
  }

  const handleDeleteQuiz = () => {
    Alert.alert('🗑️ Supprimer le quiz', `Supprimer "${quiz.titre}" et toutes ses questions ? Cette action est irréversible.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.delete(`/quiz/${quiz.id}`); onDeleted(); onClose() }
        catch { Alert.alert('Erreur', 'Impossible de supprimer le quiz.') }
      }},
    ])
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.detailSafe}>
        {/* Header */}
        <View style={s.detailHeader}>
          <TouchableOpacity onPress={onClose} style={s.detailBackBtn}>
            <Ionicons name="arrow-back" size={24} color={C.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.detailTitle} numberOfLines={1}>{quiz.titre}</Text>
            <View style={s.detailHeaderBadges}>
              <View style={[s.badge, { backgroundColor: dom.color + '15' }]}>
                <Text style={[s.badgeText, { color: dom.color }]}>{dom.label}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: diff.color + '15' }]}>
                <Text style={[s.badgeText, { color: diff.color }]}>{diff.label}</Text>
              </View>
              <Text style={s.detailQCount}>{questions.length}/10 questions</Text>
            </View>
          </View>
          <TouchableOpacity style={s.deleteIconBtn} onPress={handleDeleteQuiz}>
            <Ionicons name="trash-outline" size={18} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* Tabs — style card like Profil menu */}
        <View style={s.tabsRow}>
          {([
            { key: 'info',      label: 'Info' },
            { key: 'questions', label: `Questions (${questions.length})` },
            { key: 'ajouter',   label: '+ Ajouter' },
          ] as const).map(t => (
            <TouchableOpacity key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => { setTab(t.key); setEditingQ(null) }}>
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.detailScroll}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Info ── */}
            {tab === 'info' && (
              <View style={{ gap: 8 }}>
                <View style={s.menuCard}>
                  {[
                    { label: 'Titre',         value: quiz.titre },
                    { label: 'Matière',       value: dom.label },
                    { label: 'Difficulté',    value: diff.label },
                    { label: 'Questions',     value: `${questions.length}/10` },
                    { label: 'Score minimum', value: `${quiz.scoreMinimum}%` },
                    { label: 'Créé le',       value: formatDate(quiz.createdAt) },
                  ].map((row, i, arr) => (
                    <React.Fragment key={i}>
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>{row.label}</Text>
                        <Text style={s.infoValue}>{row.value}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={s.separator} />}
                    </React.Fragment>
                  ))}
                </View>

                {questions.length < 5 && (
                  <View style={s.warnBox}>
                    <Ionicons name="warning-outline" size={16} color={C.orange} />
                    <Text style={s.warnBoxText}>Minimum 5 questions requises. ({questions.length}/5 ajoutées)</Text>
                  </View>
                )}

                <TouchableOpacity style={s.deleteFullBtn} onPress={handleDeleteQuiz}>
                  <Ionicons name="trash-outline" size={16} color={C.danger} />
                  <Text style={s.deleteFullBtnText}>Supprimer ce quiz</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Questions ── */}
            {tab === 'questions' && (
              <View style={{ gap: 12 }}>
                {loadingQ ? (
                  <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
                ) : questions.length === 0 ? (
                  <View style={s.emptyState}>
                    <View style={s.emptyIconBox}>
                      <Ionicons name="help-circle-outline" size={32} color={C.primary} />
                    </View>
                    <Text style={s.emptyTitle}>Aucune question</Text>
                    <Text style={s.emptySubtitle}>Ajoutez des questions via l'onglet "+ Ajouter"</Text>
                  </View>
                ) : editingQ ? (
                  <View>
                    <Text style={s.sectionLabel}>Modifier la question {questions.findIndex(q => q.id === editingQ.id) + 1}</Text>
                    <QuestionForm
                      initial={{
                        enonce: editingQ.enonce, choixA: editingQ.choixA, choixB: editingQ.choixB,
                        choixC: editingQ.choixC ?? '', choixD: editingQ.choixD ?? '',
                        bonneReponse: editingQ.bonneReponse,
                        explication: editingQ.explication ?? '',
                        explicationIncorrecte: editingQ.explicationIncorrecte ?? '',
                        difficulte: editingQ.difficulte ?? quiz.difficulte ?? 'MEDIUM',
                        ordre: String(editingQ.ordre),
                      }}
                      onSubmit={handleUpdate} onCancel={() => setEditingQ(null)}
                      loading={loadingOp} submitLabel="Enregistrer les modifications"
                      quizDifficulte={quiz.difficulte}
                    />
                  </View>
                ) : (
                  questions.map((q, idx) => {
                    const qDiff = getDifficulteInfo(q.difficulte ?? quiz.difficulte)
                    return (
                      <View key={q.id} style={s.questionCard}>
                        <View style={s.questionCardHeader}>
                          <View style={s.questionNumBadge}>
                            <Text style={s.questionNum}>Q{idx + 1}</Text>
                          </View>
                          <View style={[s.badge, { backgroundColor: qDiff.color + '15' }]}>
                            <Text style={[s.badgeText, { color: qDiff.color }]}>{qDiff.label}</Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity style={s.qActionBtn} onPress={() => setEditingQ(q)}>
                            <Ionicons name="pencil-outline" size={15} color={C.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.qActionBtn, { backgroundColor: C.danger + '12' }]} onPress={() => handleDeleteQ(q.id, idx)}>
                            <Ionicons name="trash-outline" size={15} color={C.danger} />
                          </TouchableOpacity>
                        </View>

                        <Text style={s.questionEnonce}>{q.enonce}</Text>

                        <View style={s.questionChoices}>
                          {(['A', 'B', 'C', 'D'] as const).map(letter => {
                            const choix = (q as any)[`choix${letter}`]
                            if (!choix) return null
                            const isCorrect = q.bonneReponse === letter
                            return (
                              <View key={letter} style={[s.choiceRow, isCorrect && s.choiceRowCorrect]}>
                                <View style={[s.choiceLetter, isCorrect && s.choiceLetterCorrect]}>
                                  <Text style={[s.choiceLetterText, isCorrect && { color: C.white }]}>{letter}</Text>
                                </View>
                                <Text style={[s.choiceText, isCorrect && { color: C.success, fontWeight: '600' }]}>{choix}</Text>
                                {isCorrect && <Ionicons name="checkmark-circle" size={15} color={C.success} />}
                              </View>
                            )
                          })}
                        </View>

                        {q.explication && (
                          <View style={s.explainBox}>
                            <Ionicons name="checkmark-circle-outline" size={13} color={C.success} />
                            <Text style={[s.explainText, { color: C.success }]}>{q.explication}</Text>
                          </View>
                        )}
                        {q.explicationIncorrecte && (
                          <View style={[s.explainBox, { backgroundColor: C.danger + '08' }]}>
                            <Ionicons name="close-circle-outline" size={13} color={C.danger} />
                            <Text style={[s.explainText, { color: C.danger }]}>{q.explicationIncorrecte}</Text>
                          </View>
                        )}
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* ── Ajouter ── */}
            {tab === 'ajouter' && (
              <View>
                <View style={s.questionCounter}>
                  <Text style={s.questionCounterText}>Question {questions.length + 1} / 10</Text>
                  {questions.length >= 10 && <Text style={s.questionCounterFull}>Maximum atteint</Text>}
                </View>
                {questions.length >= 10 ? (
                  <View style={s.warnBox}>
                    <Ionicons name="warning-outline" size={16} color={C.orange} />
                    <Text style={s.warnBoxText}>Maximum de 10 questions atteint. Supprimez une question pour en ajouter une nouvelle.</Text>
                  </View>
                ) : (
                  <QuestionForm
                    initial={{ ...emptyQ, ordre: String(questions.length + 1) }}
                    onSubmit={handleAdd} onCancel={() => setTab('questions')}
                    loading={loadingOp} submitLabel="Ajouter la question"
                    quizDifficulte={quiz.difficulte}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props { onNavigate: (screen: string, params?: any) => void }

export default function ProfessorQuizScreen({ onNavigate }: Props) {
  const [quizzes,      setQuizzes]      = useState<Quiz[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [search,       setSearch]       = useState('')
  const [showSearch,   setShowSearch]   = useState(false)
  const [filterDom,    setFilterDom]    = useState<string | null>(null)
  const [matieres,     setMatieres]     = useState<string[]>([])

  useEffect(() => {
    SecureStore.getItemAsync('user').then(str => {
      if (str) setMatieres(JSON.parse(str).matieres ?? [])
    })
  }, [])

  const fetchQuizzes = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/quiz/my-quizzes')
      setQuizzes(res.data?.quizzes ?? [])
    } catch {
      setError('Impossible de charger vos quiz.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchQuizzes() }, [fetchQuizzes])
  const onRefresh = useCallback(() => { setRefreshing(true); fetchQuizzes() }, [fetchQuizzes])

  const filtered = quizzes
    .filter(q => !search || q.titre.toLowerCase().includes(search.toLowerCase()))
    .filter(q => !filterDom  || q.domaine === filterDom)

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.topbar}>
        <View style={{ width: 32 }} />
        <Text style={s.topbarTitle}>Mes Quiz SAT</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
    </SafeAreaView>
  )

  if (error) return (
    <SafeAreaView style={s.safe}>
      <View style={s.topbar}>
        <View style={{ width: 32 }} />
        <Text style={s.topbarTitle}>Mes Quiz SAT</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={C.textSub} />
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchQuizzes}>
          <Text style={s.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Topbar — identique au Profil ── */}
      <View style={s.topbar}>
        <View style={{ width: 32 }} />
        <Text style={s.topbarTitle}>Mes Quiz SAT</Text>
        <TouchableOpacity style={s.searchIconBtn} onPress={() => setShowSearch(v => !v)}>
          <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* ── Barre de recherche ── */}
      {showSearch && (
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={C.textSub} style={{ marginRight: 8 }} />
          <TextInput style={s.searchInput} placeholder="Rechercher un quiz..."
            placeholderTextColor={C.textSub} value={search} onChangeText={setSearch} autoFocus />
        </View>
      )}

      {/* ── Filtres matières ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll} contentContainerStyle={s.filterContent}>
        <TouchableOpacity
          style={[s.filterChip, filterDom === null && s.filterChipActive]}
          onPress={() => setFilterDom(null)}>
          <Text style={[s.filterChipText, filterDom === null && s.filterChipTextActive]}>Tous</Text>
        </TouchableOpacity>

        {(matieres.length > 0 ? DOMAINES.filter(d => matieres.includes(d.key)) : DOMAINES).map(d => (
          <TouchableOpacity key={d.key}
            style={[s.filterChip, filterDom === d.key && { backgroundColor: d.color, borderColor: d.color }]}
            onPress={() => setFilterDom(filterDom === d.key ? null : d.key)}>
            <Ionicons name={d.icon as any} size={12} color={filterDom === d.key ? C.white : d.color} style={{ marginRight: 3 }} />
            <Text style={[s.filterChipText, filterDom === d.key && { color: C.white }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Liste ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? s.emptyContainer : s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListHeaderComponent={
          /* Bouton Créer intégré dans la liste comme une carte */
          <TouchableOpacity style={s.createCard} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <View style={s.createCardIcon}>
              <Ionicons name="add" size={22} color={C.primary} />
            </View>
            <Text style={s.createCardText}>Créer un nouveau quiz</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSub} />
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconBox}>
              <Ionicons name="create-outline" size={32} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>{search || filterDom ? 'Aucun résultat' : 'Aucun quiz créé'}</Text>
            <Text style={s.emptySubtitle}>
              {search || filterDom ? 'Modifiez vos filtres.' : 'Créez votre premier quiz SAT.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <QuizCard quiz={item} onPress={() => setSelectedQuiz(item)} />
        )}
      />

      <CreateQuizModal visible={showCreate} onClose={() => setShowCreate(false)}
        onCreated={fetchQuizzes} matieres={matieres} />

      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          onUpdated={fetchQuizzes}
          onDeleted={() => { setSelectedQuiz(null); fetchQuizzes() }}
          matieres={matieres}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF', paddingBottom: -50  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  // Topbar — copié du Profil
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  topbarTitle:   { fontSize: 20, fontWeight: '800', color: C.primary },
  searchIconBtn: { width: 32, alignItems: 'center' },

  // Recherche
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  // Filtres
  filterScroll:  { height: 60,minHeight: 60,
  maxHeight: 60, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.borderStrong,
    backgroundColor: C.white,
  },
  filterChipActive:     { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: C.textSub },
  filterChipTextActive: { color: C.white },

  // Liste
  list:           { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 },
  emptyContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Bouton Créer (dans la liste, style card)
  createCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16,
    padding: 16, marginBottom: 4,
    borderWidth: 1.5, borderColor: C.primary + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  createCardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  createCardText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.primary },

  // Card quiz — style Profil card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardIconBox:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1, minWidth: 0 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  cardBadges:   { flexDirection: 'row', gap: 6, marginBottom: 6 },
  cardMeta:     { flexDirection: 'row', gap: 12 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, color: C.textSub },

  // Score badge
  scoreBox: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8, minWidth: 48,
  },
  scoreValue: { fontSize: 16, fontWeight: '800', color: C.primary },
  scoreLabel: { fontSize: 10, fontWeight: '600', color: C.primary },

  // Badges inline
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyState:   { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  // Error
  errorText:   { fontSize: 14, color: C.textSub, textAlign: 'center' },
  retryBtn:    { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText:{ color: C.white, fontWeight: '700', fontSize: 14 },

  // Modal — copié du Profil
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: C.text },
  modalCloseBtn: { padding: 4 },
  modalBody:     { paddingHorizontal: 20, paddingTop: 8 },
  modalBtn:      { backgroundColor: C.primary, marginHorizontal: 20, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  modalBtnText:  { color: C.white, fontSize: 15, fontWeight: '700' },
  cancelBtn:     { borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 14, paddingVertical: 15, alignItems: 'center', paddingHorizontal: 20 },
  cancelBtnText: { color: C.textSub, fontSize: 14, fontWeight: '600' },

  // Inputs — style Profil
  inputLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text, backgroundColor: '#FAFAFA', marginBottom: 2,
  },
  pickerRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pickerChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.bg },
  pickerChipText:{ fontSize: 13, fontWeight: '600' },

  // Warn / Error banners
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.orange + '12', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.orange + '40',
  },
  warnBoxText:     { flex: 1, fontSize: 12, color: C.orange, lineHeight: 17 },
  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.danger + '12', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBannerText: { flex: 1, fontSize: 13, color: C.danger },

  // Détail modal
  detailSafe:   { flex: 1, backgroundColor: C.bg },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailBackBtn:     { padding: 4 },
  detailTitle:       { fontSize: 15, fontWeight: '700', color: C.text },
  detailHeaderBadges:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detailQCount:      { fontSize: 11, color: C.textSub, fontWeight: '600' },
  deleteIconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: C.danger + '12', alignItems: 'center', justifyContent: 'center' },

  // Tabs — style plus sobre
  tabsRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab:         { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  tabActive:   { backgroundColor: C.primary, borderColor: C.primary },
  tabText:     { fontSize: 12, fontWeight: '600', color: C.textSub },
  tabTextActive:{ color: C.white },
  detailScroll: { flex: 1 },

  // Info rows — copié du Profil
  menuCard: {
    backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  infoLabel: { fontSize: 14, color: C.textSub },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.text },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 0 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 10, marginLeft: 2 },

  // Bouton supprimer plein
  deleteFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.danger + '40', backgroundColor: C.danger + '08',
  },
  deleteFullBtnText: { fontSize: 14, color: C.danger, fontWeight: '700' },

  // Question card — style Profil card
  questionCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  questionCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  questionNumBadge:  { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  questionNum:       { fontSize: 12, fontWeight: '800', color: C.primary },
  qActionBtn:        { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  questionEnonce:    { fontSize: 14, color: C.text, lineHeight: 20, marginBottom: 10, fontWeight: '500' },
  questionChoices:   { gap: 6 },
  choiceRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.bg },
  choiceRowCorrect:  { backgroundColor: C.success + '10' },
  choiceLetter:      { width: 24, height: 24, borderRadius: 12, backgroundColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceLetterCorrect:{ backgroundColor: C.success },
  choiceLetterText:  { fontSize: 11, fontWeight: '800', color: C.textSub },
  choiceText:        { flex: 1, fontSize: 13, color: C.text },
  explainBox:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.success + '08', borderRadius: 8, padding: 8, marginTop: 8 },
  explainText:       { flex: 1, fontSize: 12, lineHeight: 17 },
  explainHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },

  // Réponse sélecteur
  reponseRow:          { flexDirection: 'row', gap: 8, marginBottom: 4 },
  reponseBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4, borderRadius: 10, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.bg },
  reponseBtnActive:    { backgroundColor: C.primary, borderColor: C.primary },
  reponseBtnText:      { fontSize: 15, fontWeight: '700', color: C.textSub },
  reponseBtnTextActive:{ color: C.white },

  // Compteur questions
  questionCounter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, marginBottom: 12 },
  questionCounterText: { fontSize: 13, fontWeight: '700', color: C.primary },
  questionCounterFull: { fontSize: 12, color: C.danger, fontWeight: '600' },
})
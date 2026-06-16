import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import api from '../../services/auth.service'

// ─── Palette (alignée sur ProfessorQuizScreen) ────────────────────────────
const C = {
  primary:      '#0D6B5E',
  primaryLight: '#E8F5F3',
  bg:           '#F5F7F6',
  white:        '#FFFFFF',
  text:         '#1A1A1A',
  textSub:      '#888888',
  border:       '#F0F0F0',
  borderStrong: '#E0E0E0',
  success:      '#10B981',
  orange:       '#F97316',
  danger:       '#E53935',
  blue:         '#3B82F6',
  purple:       '#7C3AED',
}

// ─── Matières SAT disponibles (mêmes que ProfessorQuizScreen) ────────────
const SAT_MATIERES = [
  { key: 'MATH',    label: 'Math',    icon: 'calculator-outline',  color: C.primary },
  { key: 'READING', label: 'Reading', icon: 'book-outline',        color: C.blue    },
  { key: 'WRITING', label: 'Writing', icon: 'create-outline',      color: C.purple  },
]

const NIVEAUX = [
  { key: 'STANDARD', label: 'Standard', color: C.primary },
  { key: 'HONORS',   label: 'Honors',   color: C.orange  },
  { key: 'AP',       label: 'AP',       color: C.danger  },
]

const LESSON_TYPES = [
  { key: 'VIDEO', label: 'Vidéo', icon: 'play-circle-outline'   },
  { key: 'PDF',   label: 'PDF',   icon: 'document-text-outline' },
  { key: 'TEXT',  label: 'Texte', icon: 'reader-outline'        },
]

// ─── Types ────────────────────────────────────────────────────────────────
interface Subject {
  id: string
  nom: string
  description?: string
  icon?: string
  couleur?: string
  domaine: string   // MATH | READING | WRITING
  niveau: string    // STANDARD | HONORS | AP
  isActive: boolean
  chaptersCount?: number
  lessonsCount?: number
}

interface Chapter {
  id: string
  titre: string
  description?: string
  ordre: number
  subjectId: string
  lessonsCount?: number
}

interface Lesson {
  id: string
  titre: string
  description?: string
  type: string
  videoUrl?: string
  pdfUrl?: string
  duree?: number
  ordre: number
  isFree: boolean
  chapterId: string
}

type CourseView = 'subjects' | 'chapters' | 'lessons'

// ─── Helpers ──────────────────────────────────────────────────────────────
function getMatiereInfo(key: string) {
  return SAT_MATIERES.find(m => m.key === key) ?? SAT_MATIERES[0]
}
function getNiveauInfo(key: string) {
  return NIVEAUX.find(n => n.key === key) ?? NIVEAUX[0]
}
function getLessonTypeInfo(key: string) {
  return LESSON_TYPES.find(t => t.key === key) ?? LESSON_TYPES[0]
}

// ─── Reusable BottomModal ─────────────────────────────────────────────────
function BottomModal({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function FieldInput({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        placeholder={placeholder}
        placeholderTextColor={C.textSub}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </>
  )
}

// ─── Sélecteur Matière (filtré selon matieres prof) ──────────────────────
function MatierePicker({
  value, onChange, matieres, label,
}: {
  value: string; onChange: (v: string) => void; matieres: string[]; label?: string
}) {
  const available = matieres.length > 0
    ? SAT_MATIERES.filter(m => matieres.includes(m.key))
    : SAT_MATIERES

  return (
    <View>
      {label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={s.pickerRow}>
        {available.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[s.pickerChip, value === m.key && { backgroundColor: m.color, borderColor: m.color }]}
            onPress={() => onChange(m.key)}
          >
            <Ionicons name={m.icon as any} size={14} color={value === m.key ? C.white : m.color} />
            <Text style={[s.pickerChipText, { color: value === m.key ? C.white : m.color }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─── Sélecteur Niveau ────────────────────────────────────────────────────
function NiveauPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <View>
      {label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={s.pickerRow}>
        {NIVEAUX.map(n => (
          <TouchableOpacity
            key={n.key}
            style={[s.pickerChip, value === n.key && { backgroundColor: n.color, borderColor: n.color }]}
            onPress={() => onChange(n.key)}
          >
            <Text style={[s.pickerChipText, { color: value === n.key ? C.white : n.color }]}>{n.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─── Modal Créer / Éditer Matière ─────────────────────────────────────────
function SubjectModal({
  visible, onClose, onDone, matieres, initial,
}: {
  visible: boolean
  onClose: () => void
  onDone: () => void
  matieres: string[]
  initial?: Subject | null
}) {
  const isEdit = !!initial
  const defaultDomaine = matieres.length === 1 ? matieres[0] : (matieres[0] ?? 'MATH')

  const [form, setForm] = useState({
    nom: '', description: '', icon: '📚', domaine: defaultDomaine, niveau: 'STANDARD',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({
          nom: initial.nom,
          description: initial.description ?? '',
          icon: initial.icon ?? '📚',
          domaine: initial.domaine,
          niveau: initial.niveau,
        })
      } else {
        setForm({ nom: '', description: '', icon: '📚', domaine: defaultDomaine, niveau: 'STANDARD' })
      }
      setError('')
    }
  }, [visible, initial, defaultDomaine])

  const handleSave = async () => {
    if (!form.nom.trim()) { setError('Le nom est obligatoire.'); return }
    try {
      setLoading(true)
      const payload = {
        nom: form.nom.trim(),
        description: form.description.trim(),
        icon: form.icon,
        domaine: form.domaine,
        niveau: form.niveau,
      }
      if (isEdit) {
        await api.put(`/courses/subjects/${initial!.id}`, payload)
      } else {
        await api.post('/courses/subjects', payload)
      }
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur.')
    } finally { setLoading(false) }
  }

  return (
    <BottomModal visible={visible} title={isEdit ? 'Modifier la matière' : 'Nouvelle matière'} onClose={onClose}>
      <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}
        <FieldInput
          label="Nom *"
          value={form.nom}
          onChange={(v: string) => setForm(f => ({ ...f, nom: v }))}
          placeholder="Ex: SAT Mathematics — Honors"
        />
        <FieldInput
          label="Description"
          value={form.description}
          onChange={(v: string) => setForm(f => ({ ...f, description: v }))}
          placeholder="Décrire le contenu..."
          multiline
        />
        <FieldInput
          label="Icône (emoji)"
          value={form.icon}
          onChange={(v: string) => setForm(f => ({ ...f, icon: v }))}
          placeholder="📚"
        />
        <MatierePicker
          label={matieres.length === 1 ? `Matière (${getMatiereInfo(matieres[0]).label})` : 'Matière *'}
          value={form.domaine}
          onChange={v => setForm(f => ({ ...f, domaine: v }))}
          matieres={matieres}
        />
        <NiveauPicker
          label="Niveau *"
          value={form.niveau}
          onChange={v => setForm(f => ({ ...f, niveau: v }))}
        />
        <View style={{ height: 20 }} />
      </ScrollView>
      <TouchableOpacity style={[s.modalBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={s.modalBtnText}>{isEdit ? 'Enregistrer' : 'Créer la matière'}</Text>
        }
      </TouchableOpacity>
    </BottomModal>
  )
}

// ─── Modal Créer / Éditer Chapitre ────────────────────────────────────────
function ChapterModal({
  visible, subjectId, onClose, onDone, initial,
}: {
  visible: boolean; subjectId: string; onClose: () => void; onDone: () => void; initial?: Chapter | null
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({ titre: '', description: '', ordre: '1' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({ titre: initial.titre, description: initial.description ?? '', ordre: String(initial.ordre) })
      } else {
        setForm({ titre: '', description: '', ordre: '1' })
      }
      setError('')
    }
  }, [visible, initial])

  const handleSave = async () => {
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return }
    try {
      setLoading(true)
      const payload = { titre: form.titre.trim(), description: form.description.trim(), ordre: parseInt(form.ordre) || 1, subjectId }
      if (isEdit) {
        await api.put(`/courses/chapters/${initial!.id}`, payload)
      } else {
        await api.post('/courses/chapters', payload)
      }
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur.')
    } finally { setLoading(false) }
  }

  return (
    <BottomModal visible={visible} title={isEdit ? 'Modifier le chapitre' : 'Nouveau chapitre'} onClose={onClose}>
      <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}
        <FieldInput label="Titre *" value={form.titre} onChange={(v: string) => setForm(f => ({ ...f, titre: v }))} placeholder="Ex: Chapitre 1 — Algèbre" />
        <FieldInput label="Description" value={form.description} onChange={(v: string) => setForm(f => ({ ...f, description: v }))} placeholder="Description..." multiline />
        <FieldInput label="Ordre" value={form.ordre} onChange={(v: string) => setForm(f => ({ ...f, ordre: v }))} placeholder="1" keyboardType="numeric" />
        <View style={{ height: 20 }} />
      </ScrollView>
      <TouchableOpacity style={[s.modalBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={s.modalBtnText}>{isEdit ? 'Enregistrer' : 'Créer le chapitre'}</Text>
        }
      </TouchableOpacity>
    </BottomModal>
  )
}

// ─── Modal Créer / Éditer Leçon ───────────────────────────────────────────
function LessonModal({
  visible, chapterId, onClose, onDone, initial,
}: {
  visible: boolean; chapterId: string; onClose: () => void; onDone: () => void; initial?: Lesson | null
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    titre: '', description: '', type: 'VIDEO',
    videoUrl: '', pdfUrl: '', duree: '', ordre: '1', isFree: false,
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({
          titre: initial.titre,
          description: initial.description ?? '',
          type: initial.type,
          videoUrl: initial.videoUrl ?? '',
          pdfUrl: initial.pdfUrl ?? '',
          duree: initial.duree ? String(initial.duree) : '',
          ordre: String(initial.ordre),
          isFree: initial.isFree,
        })
      } else {
        setForm({ titre: '', description: '', type: 'VIDEO', videoUrl: '', pdfUrl: '', duree: '', ordre: '1', isFree: false })
      }
      setError('')
      setUploadProgress(0)
    }
  }, [visible, initial])

  // Upload fichier (vidéo ou PDF)
  const handlePickFile = async (type: 'video' | 'pdf') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'video' ? ['video/*'] : ['application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const file = result.assets[0]
      setUploadingFile(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? (type === 'video' ? 'video/mp4' : 'application/pdf'),
      } as any)
      formData.append('type', type.toUpperCase())

      const uploadRes = await api.post('/courses/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      const url = uploadRes.data?.url ?? ''
      if (type === 'video') setForm(f => ({ ...f, videoUrl: url }))
      else setForm(f => ({ ...f, pdfUrl: url }))
    } catch (e: any) {
      Alert.alert('Erreur upload', e?.message ?? 'Impossible de téléverser le fichier.')
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
    }
  }

  const handleSave = async () => {
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return }
    try {
      setLoading(true)
      const payload = {
        titre: form.titre.trim(),
        description: form.description.trim(),
        type: form.type,
        videoUrl: form.videoUrl.trim() || null,
        pdfUrl: form.pdfUrl.trim() || null,
        duree: parseInt(form.duree) || null,
        ordre: parseInt(form.ordre) || 1,
        isFree: form.isFree,
        chapterId,
      }
      if (isEdit) {
        await api.put(`/courses/lessons/${initial!.id}`, payload)
      } else {
        await api.post('/courses/lessons', payload)
      }
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur.')
    } finally { setLoading(false) }
  }

  return (
    <BottomModal visible={visible} title={isEdit ? 'Modifier la leçon' : 'Nouvelle leçon'} onClose={onClose}>
      <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <FieldInput label="Titre *" value={form.titre} onChange={(v: string) => setForm(f => ({ ...f, titre: v }))} placeholder="Ex: Introduction à l'algèbre" />
        <FieldInput label="Description" value={form.description} onChange={(v: string) => setForm(f => ({ ...f, description: v }))} placeholder="Description..." multiline />

        {/* Type */}
        <Text style={s.inputLabel}>Type de leçon *</Text>
        <View style={s.pickerRow}>
          {LESSON_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.pickerChip, form.type === t.key && { backgroundColor: C.primary, borderColor: C.primary }]}
              onPress={() => setForm(f => ({ ...f, type: t.key }))}
            >
              <Ionicons name={t.icon as any} size={14} color={form.type === t.key ? C.white : C.textSub} />
              <Text style={[s.pickerChipText, { color: form.type === t.key ? C.white : C.textSub }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload vidéo */}
        {form.type === 'VIDEO' && (
          <View style={{ marginTop: 4 }}>
            <Text style={s.inputLabel}>Fichier vidéo</Text>
            <TouchableOpacity
              style={[s.uploadBtn, uploadingFile && { opacity: 0.6 }]}
              onPress={() => handlePickFile('video')}
              disabled={uploadingFile}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={C.primary} />
              <Text style={s.uploadBtnText}>
                {uploadingFile ? `Upload... ${uploadProgress}%` : form.videoUrl ? 'Remplacer la vidéo' : 'Choisir une vidéo'}
              </Text>
            </TouchableOpacity>
            {uploadingFile && (
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${uploadProgress}%` as any }]} />
              </View>
            )}
            {form.videoUrl ? (
              <View style={s.urlPreview}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={s.urlPreviewText} numberOfLines={1}>{form.videoUrl}</Text>
              </View>
            ) : null}
            {/* Fallback: URL manuelle */}
            <Text style={[s.inputLabel, { marginTop: 8 }]}>ou URL directe</Text>
            <TextInput
              style={s.input}
              placeholder="https://..."
              placeholderTextColor={C.textSub}
              value={form.videoUrl}
              onChangeText={v => setForm(f => ({ ...f, videoUrl: v }))}
            />
          </View>
        )}

        {/* Upload PDF */}
        {form.type === 'PDF' && (
          <View style={{ marginTop: 4 }}>
            <Text style={s.inputLabel}>Fichier PDF</Text>
            <TouchableOpacity
              style={[s.uploadBtn, uploadingFile && { opacity: 0.6 }]}
              onPress={() => handlePickFile('pdf')}
              disabled={uploadingFile}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={C.primary} />
              <Text style={s.uploadBtnText}>
                {uploadingFile ? `Upload... ${uploadProgress}%` : form.pdfUrl ? 'Remplacer le PDF' : 'Choisir un PDF'}
              </Text>
            </TouchableOpacity>
            {uploadingFile && (
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${uploadProgress}%` as any }]} />
              </View>
            )}
            {form.pdfUrl ? (
              <View style={s.urlPreview}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={s.urlPreviewText} numberOfLines={1}>{form.pdfUrl}</Text>
              </View>
            ) : null}
            <Text style={[s.inputLabel, { marginTop: 8 }]}>ou URL directe</Text>
            <TextInput
              style={s.input}
              placeholder="https://..."
              placeholderTextColor={C.textSub}
              value={form.pdfUrl}
              onChangeText={v => setForm(f => ({ ...f, pdfUrl: v }))}
            />
          </View>
        )}

        <FieldInput label="Durée (minutes)" value={form.duree} onChange={(v: string) => setForm(f => ({ ...f, duree: v }))} placeholder="15" keyboardType="numeric" />
        <FieldInput label="Ordre" value={form.ordre} onChange={(v: string) => setForm(f => ({ ...f, ordre: v }))} placeholder="1" keyboardType="numeric" />

        {/* Accès */}
        <Text style={s.inputLabel}>Accès</Text>
        <View style={s.pickerRow}>
          {[{ label: 'Gratuit', val: true, color: C.success }, { label: 'Premium', val: false, color: C.orange }].map(opt => (
            <TouchableOpacity
              key={String(opt.val)}
              style={[s.pickerChip, form.isFree === opt.val && { backgroundColor: opt.color, borderColor: opt.color }]}
              onPress={() => setForm(f => ({ ...f, isFree: opt.val }))}
            >
              <Text style={[s.pickerChipText, { color: form.isFree === opt.val ? C.white : opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
      <TouchableOpacity style={[s.modalBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={s.modalBtnText}>{isEdit ? 'Enregistrer' : 'Créer la leçon'}</Text>
        }
      </TouchableOpacity>
    </BottomModal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorCoursesScreen({ onNavigate }: Props) {
  const [view,            setView]            = useState<CourseView>('subjects')
  const [subjects,        setSubjects]        = useState<Subject[]>([])
  const [chapters,        setChapters]        = useState<Chapter[]>([])
  const [lessons,         setLessons]         = useState<Lesson[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [matieres,        setMatieres]        = useState<string[]>([])

  // Modals create / edit
  const [showSubjectModal,  setShowSubjectModal]  = useState(false)
  const [showChapterModal,  setShowChapterModal]  = useState(false)
  const [showLessonModal,   setShowLessonModal]   = useState(false)
  const [editingSubject,    setEditingSubject]    = useState<Subject | null>(null)
  const [editingChapter,    setEditingChapter]    = useState<Chapter | null>(null)
  const [editingLesson,     setEditingLesson]     = useState<Lesson | null>(null)

  // Filtre matière (vue subjects)
  const [filterDomaine, setFilterDomaine] = useState<string | null>(null)

  // ── Charger les matières du prof depuis SecureStore ───────────────────
  useEffect(() => {
    SecureStore.getItemAsync('user').then(str => {
      if (str) {
        const user = JSON.parse(str)
        setMatieres(user.matieres ?? [])
      }
    })
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/courses/subjects')
      setSubjects(res.data?.subjects ?? [])
    } catch {
      setError('Impossible de charger les matières.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  const fetchChapters = useCallback(async (subjectId: string) => {
    try {
      setLoading(true); setError(null)
      const res = await api.get(`/courses/subjects/${subjectId}/chapters`)
      setChapters(res.data?.chapters ?? [])
    } catch { setError('Impossible de charger les chapitres.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  const fetchLessons = useCallback(async (chapterId: string) => {
    try {
      setLoading(true); setError(null)
      const res = await api.get(`/courses/chapters/${chapterId}/lessons`)
      setLessons(res.data?.lessons ?? [])
    } catch { setError('Impossible de charger les leçons.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (view === 'subjects') fetchSubjects()
    else if (view === 'chapters' && selectedSubject) fetchChapters(selectedSubject.id)
    else if (view === 'lessons' && selectedChapter) fetchLessons(selectedChapter.id)
  }, [view, selectedSubject, selectedChapter, fetchSubjects, fetchChapters, fetchLessons])

  // ── Suppression ───────────────────────────────────────────────────────
  const deleteSubject = (item: Subject) => {
    Alert.alert('Supprimer la matière', `Supprimer "${item.nom}" et tout son contenu ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/courses/subjects/${item.id}`)
          fetchSubjects()
        } catch { Alert.alert('Erreur', 'Impossible de supprimer.') }
      }},
    ])
  }

  const deleteChapter = (item: Chapter) => {
    Alert.alert('Supprimer le chapitre', `Supprimer "${item.titre}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/courses/chapters/${item.id}`)
          if (selectedSubject) fetchChapters(selectedSubject.id)
        } catch { Alert.alert('Erreur', 'Impossible de supprimer.') }
      }},
    ])
  }

  const deleteLesson = (item: Lesson) => {
    Alert.alert('Supprimer la leçon', `Supprimer "${item.titre}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/courses/lessons/${item.id}`)
          if (selectedChapter) fetchLessons(selectedChapter.id)
        } catch { Alert.alert('Erreur', 'Impossible de supprimer.') }
      }},
    ])
  }

  // ── Toggle actif/inactif matière ──────────────────────────────────────
  const toggleSubjectActive = async (item: Subject) => {
    try {
      await api.patch(`/courses/subjects/${item.id}/toggle`)
      fetchSubjects()
    } catch { Alert.alert('Erreur', 'Impossible de changer le statut.') }
  }

  // ── Navigation ────────────────────────────────────────────────────────
  const openSubject = (subject: Subject) => {
    setSelectedSubject(subject)
    setView('chapters')
    fetchChapters(subject.id)
  }

  const openChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter)
    setView('lessons')
    fetchLessons(chapter.id)
  }

  const goBack = () => {
    if (view === 'lessons') {
      setView('chapters')
      setSelectedChapter(null)
    } else if (view === 'chapters') {
      setView('subjects')
      setSelectedSubject(null)
    }
  }

  // ── Action contextuelle (edit / delete) via long-press ───────────────
  const onLongPressSubject = (item: Subject) => {
    Alert.alert(item.nom, 'Que voulez-vous faire ?', [
      { text: 'Modifier',        onPress: () => { setEditingSubject(item); setShowSubjectModal(true) } },
      { text: item.isActive ? 'Désactiver' : 'Activer', onPress: () => toggleSubjectActive(item) },
      { text: 'Supprimer',       style: 'destructive', onPress: () => deleteSubject(item) },
      { text: 'Annuler',         style: 'cancel' },
    ])
  }

  const onLongPressChapter = (item: Chapter) => {
    Alert.alert(item.titre, 'Que voulez-vous faire ?', [
      { text: 'Modifier',  onPress: () => { setEditingChapter(item); setShowChapterModal(true) } },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteChapter(item) },
      { text: 'Annuler',   style: 'cancel' },
    ])
  }

  const onLongPressLesson = (item: Lesson) => {
    Alert.alert(item.titre, 'Que voulez-vous faire ?', [
      { text: 'Modifier',  onPress: () => { setEditingLesson(item); setShowLessonModal(true) } },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteLesson(item) },
      { text: 'Annuler',   style: 'cancel' },
    ])
  }

  // ── Bouton créer ──────────────────────────────────────────────────────
  const handleCreate = () => {
    if (view === 'subjects')  { setEditingSubject(null);  setShowSubjectModal(true) }
    else if (view === 'chapters') { setEditingChapter(null); setShowChapterModal(true) }
    else                      { setEditingLesson(null);   setShowLessonModal(true) }
  }

  const createLabel = view === 'subjects' ? 'Matière' : view === 'chapters' ? 'Chapitre' : 'Leçon'

  const headerTitle = view === 'subjects' ? 'Mes cours'
    : view === 'chapters' ? (selectedSubject?.nom ?? 'Chapitres')
    : (selectedChapter?.titre ?? 'Leçons')

  // ── Subjects filtrés (selon domaine du prof + filtre UI) ──────────────
  const filteredSubjects = subjects.filter(s => {
    const okMatieres = matieres.length === 0 || matieres.includes(s.domaine)
    const okFilter   = !filterDomaine || s.domaine === filterDomaine
    return okMatieres && okFilter
  })

  const data: any[] = view === 'subjects' ? filteredSubjects : view === 'chapters' ? chapters : lessons

  // ─── Rendu cartes ────────────────────────────────────────────────────
  const renderSubject = ({ item }: { item: Subject }) => {
    const mat = getMatiereInfo(item.domaine)
    const niv = getNiveauInfo(item.niveau)
    return (
      <TouchableOpacity
        style={[s.card, !item.isActive && s.cardInactive]}
        onPress={() => openSubject(item)}
        onLongPress={() => onLongPressSubject(item)}
        activeOpacity={0.8}
      >
        {/* Icône */}
        <View style={[s.cardIconBox, { backgroundColor: mat.color + '15' }]}>
          <Text style={s.cardEmoji}>{item.icon ?? '📚'}</Text>
        </View>

        <View style={s.cardContent}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.nom}</Text>

          {/* Badges matière + niveau */}
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: mat.color + '15' }]}>
              <Ionicons name={mat.icon as any} size={10} color={mat.color} />
              <Text style={[s.badgeText, { color: mat.color }]}>{mat.label}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: niv.color + '15' }]}>
              <Text style={[s.badgeText, { color: niv.color }]}>{niv.label}</Text>
            </View>
            {!item.isActive && (
              <View style={[s.badge, { backgroundColor: C.textSub + '20' }]}>
                <Text style={[s.badgeText, { color: C.textSub }]}>Inactif</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {(item.chaptersCount !== undefined || item.lessonsCount !== undefined) && (
            <View style={s.statRow}>
              {item.chaptersCount !== undefined && (
                <View style={s.statItem}>
                  <Ionicons name="folder-outline" size={11} color={C.textSub} />
                  <Text style={s.statText}>{item.chaptersCount} chapitre{item.chaptersCount !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {item.lessonsCount !== undefined && (
                <View style={s.statItem}>
                  <Ionicons name="document-text-outline" size={11} color={C.textSub} />
                  <Text style={s.statText}>{item.lessonsCount} leçon{item.lessonsCount !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.editIconBtn}
            onPress={() => { setEditingSubject(item); setShowSubjectModal(true) }}
          >
            <Ionicons name="pencil-outline" size={14} color={C.primary} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={C.textSub} />
        </View>
      </TouchableOpacity>
    )
  }

  const renderChapter = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => openChapter(item)}
      onLongPress={() => onLongPressChapter(item)}
      activeOpacity={0.8}
    >
      <View style={[s.cardIconBox, { backgroundColor: C.primaryLight }]}>
        <Text style={s.cardOrderText}>{String(item.ordre).padStart(2, '0')}</Text>
      </View>
      <View style={s.cardContent}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.titre}</Text>
        {item.description ? <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
        {item.lessonsCount !== undefined && (
          <View style={s.statRow}>
            <View style={s.statItem}>
              <Ionicons name="document-text-outline" size={11} color={C.textSub} />
              <Text style={s.statText}>{item.lessonsCount} leçon{item.lessonsCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity
          style={s.editIconBtn}
          onPress={() => { setEditingChapter(item); setShowChapterModal(true) }}
        >
          <Ionicons name="pencil-outline" size={14} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.editIconBtn, { backgroundColor: C.danger + '12' }]}
          onPress={() => deleteChapter(item)}
        >
          <Ionicons name="trash-outline" size={14} color={C.danger} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={C.textSub} />
      </View>
    </TouchableOpacity>
  )

  const renderLesson = ({ item }: { item: Lesson }) => {
    const typeInfo = getLessonTypeInfo(item.type)
    return (
      <TouchableOpacity
        style={s.card}
        onLongPress={() => onLongPressLesson(item)}
        activeOpacity={0.9}
      >
        <View style={[s.cardIconBox, { backgroundColor: item.isFree ? C.primaryLight : '#FFF7ED' }]}>
          <Ionicons name={typeInfo.icon as any} size={22} color={item.isFree ? C.primary : C.orange} />
        </View>
        <View style={s.cardContent}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.titre}</Text>
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: C.primaryLight }]}>
              <Text style={[s.badgeText, { color: C.primary }]}>{typeInfo.label}</Text>
            </View>
            {item.duree ? (
              <View style={s.statItem}>
                <Ionicons name="time-outline" size={11} color={C.textSub} />
                <Text style={s.statText}>{item.duree} min</Text>
              </View>
            ) : null}
            {item.isFree && (
              <View style={[s.badge, { backgroundColor: C.success + '15' }]}>
                <Text style={[s.badgeText, { color: C.success }]}>Gratuit</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.editIconBtn}
            onPress={() => { setEditingLesson(item); setShowLessonModal(true) }}
          >
            <Ionicons name="pencil-outline" size={14} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.editIconBtn, { backgroundColor: C.danger + '12' }]}
            onPress={() => deleteLesson(item)}
          >
            <Ionicons name="trash-outline" size={14} color={C.danger} />
          </TouchableOpacity>
          <Text style={s.cardOrder}>#{item.ordre}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const emptyTitle    = view === 'subjects' ? 'Aucune matière'  : view === 'chapters' ? 'Aucun chapitre' : 'Aucune leçon'
  const emptySubtitle = view === 'subjects' ? 'Créez votre première matière SAT.'
    : view === 'chapters' ? 'Ajoutez un premier chapitre.'
    : 'Ajoutez une première leçon.'

  // ─── Matières disponibles pour le prof (filtres barre) ───────────────
  const availableMatieres = matieres.length > 0
    ? SAT_MATIERES.filter(m => matieres.includes(m.key))
    : SAT_MATIERES

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {view !== 'subjects' && (
            <TouchableOpacity onPress={goBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.primary} />
            </TouchableOpacity>
          )}
          <Text style={s.title} numberOfLines={1}>{headerTitle}</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={18} color={C.white} />
          <Text style={s.createBtnText}>{createLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Breadcrumb ── */}
      {view !== 'subjects' && (
        <View style={s.breadcrumb}>
          <TouchableOpacity onPress={() => { setView('subjects'); setSelectedSubject(null); setSelectedChapter(null) }}>
            <Text style={s.breadcrumbLink}>Matières</Text>
          </TouchableOpacity>
          {selectedSubject && (
            <>
              <Ionicons name="chevron-forward" size={12} color={C.textSub} />
              {view === 'lessons'
                ? <TouchableOpacity onPress={() => { setView('chapters'); setSelectedChapter(null); fetchChapters(selectedSubject.id) }}>
                    <Text style={s.breadcrumbLink}>{selectedSubject.nom}</Text>
                  </TouchableOpacity>
                : <Text style={s.breadcrumbActive}>{selectedSubject.nom}</Text>
              }
            </>
          )}
          {view === 'lessons' && selectedChapter && (
            <>
              <Ionicons name="chevron-forward" size={12} color={C.textSub} />
              <Text style={s.breadcrumbActive}>{selectedChapter.titre}</Text>
            </>
          )}
        </View>
      )}

      {/* ── Filtre matières (uniquement vue subjects) ── */}
      {view === 'subjects' && availableMatieres.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filterScroll}
          contentContainerStyle={s.filterContent}
        >
          <TouchableOpacity
            style={[s.filterChip, filterDomaine === null && s.filterChipActive]}
            onPress={() => setFilterDomaine(null)}
          >
            <Text style={[s.filterChipText, filterDomaine === null && s.filterChipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {availableMatieres.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[s.filterChip, filterDomaine === m.key && { backgroundColor: m.color, borderColor: m.color }]}
              onPress={() => setFilterDomaine(filterDomaine === m.key ? null : m.key)}
            >
              <Ionicons name={m.icon as any} size={12} color={filterDomaine === m.key ? C.white : m.color} style={{ marginRight: 3 }} />
              <Text style={[s.filterChipText, filterDomaine === m.key && { color: C.white }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Compteur ── */}
      {!loading && data.length > 0 && (
        <View style={s.countBanner}>
          <Ionicons
            name={view === 'subjects' ? 'layers-outline' : view === 'chapters' ? 'folder-outline' : 'document-text-outline'}
            size={13}
            color={C.primary}
          />
          <Text style={s.countBannerText}>
            {data.length} {view === 'subjects' ? `matière${data.length > 1 ? 's' : ''}` : view === 'chapters' ? `chapitre${data.length > 1 ? 's' : ''}` : `leçon${data.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* ── Contenu principal ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.textSub} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
            <Text style={s.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={data.length === 0 ? s.emptyContainer : s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconBox}>
                <Ionicons
                  name={view === 'subjects' ? 'layers-outline' : view === 'chapters' ? 'folder-outline' : 'document-text-outline'}
                  size={32}
                  color={C.primary}
                />
              </View>
              <Text style={s.emptyTitle}>{emptyTitle}</Text>
              <Text style={s.emptySubtitle}>{emptySubtitle}</Text>
              <TouchableOpacity style={[s.createBtn, { marginTop: 16 }]} onPress={handleCreate}>
                <Ionicons name="add" size={18} color={C.white} />
                <Text style={s.createBtnText}>{createLabel}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }: any) => {
            if (view === 'subjects') return renderSubject({ item: item as Subject })
            if (view === 'chapters') return renderChapter({ item: item as Chapter })
            return renderLesson({ item: item as Lesson })
          }}
        />
      )}

      {/* ── Modals ── */}
      <SubjectModal
        visible={showSubjectModal}
        onClose={() => { setShowSubjectModal(false); setEditingSubject(null) }}
        onDone={fetchSubjects}
        matieres={matieres}
        initial={editingSubject}
      />
      <ChapterModal
        visible={showChapterModal}
        subjectId={selectedSubject?.id ?? ''}
        onClose={() => { setShowChapterModal(false); setEditingChapter(null) }}
        onDone={() => selectedSubject && fetchChapters(selectedSubject.id)}
        initial={editingChapter}
      />
      <LessonModal
        visible={showLessonModal}
        chapterId={selectedChapter?.id ?? ''}
        onClose={() => { setShowLessonModal(false); setEditingLesson(null) }}
        onDone={() => selectedChapter && fetchLessons(selectedChapter.id)}
        initial={editingLesson}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 },
  backBtn:       { padding: 2 },
  title:         { fontSize: 20, fontWeight: '800', color: C.primary, flex: 1 },
  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  createBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },

  // Breadcrumb
  breadcrumb:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  breadcrumbLink:   { fontSize: 12, color: C.primary, fontWeight: '600' },
  breadcrumbActive: { fontSize: 12, color: C.textSub },

  // Filtre matières
  filterScroll:         { height: 56, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.white },
  filterChipActive:     { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: C.textSub },
  filterChipTextActive: { color: C.white },

  // Compteur
  countBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8 },
  countBannerText: { fontSize: 12, color: C.primary, fontWeight: '600' },

  // Liste
  list:           { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 },
  emptyContainer: { flex: 1 },

  // Carte
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: C.border,
  },
  cardInactive:  { opacity: 0.55 },
  cardIconBox:   { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardEmoji:     { fontSize: 24 },
  cardOrderText: { fontSize: 16, fontWeight: '800', color: C.primary },
  cardContent:   { flex: 1, minWidth: 0 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardDesc:      { fontSize: 12, color: C.textSub },
  cardOrder:     { fontSize: 12, fontWeight: '700', color: C.textSub },

  // Badges
  badgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Stats
  statRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 11, color: C.textSub },

  // Actions sur carte
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editIconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.text },
  emptySubtitle:{ fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  // Error
  errorText:    { fontSize: 14, color: C.textSub, textAlign: 'center' },
  retryBtn:     { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  // Modal
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

  // Inputs
  inputLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input:      { borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, backgroundColor: '#FAFAFA', marginBottom: 2 },
  pickerRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pickerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.bg },
  pickerChipText: { fontSize: 13, fontWeight: '600' },

  // Upload
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, borderStyle: 'dashed',
    padding: 14, backgroundColor: C.primaryLight,
  },
  uploadBtnText: { fontSize: 14, color: C.primary, fontWeight: '600', flex: 1 },
  progressBar:  { height: 4, backgroundColor: C.borderStrong, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },
  urlPreview:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, padding: 8, backgroundColor: C.success + '10', borderRadius: 8 },
  urlPreviewText:{ flex: 1, fontSize: 11, color: C.success },

  // Error banner
  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.danger + '12', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBannerText: { flex: 1, fontSize: 13, color: C.danger },
})
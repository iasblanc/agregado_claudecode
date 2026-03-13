'use client'
import { useParams } from 'next/navigation'
import VagaForm from '../../_form'

export default function EditarVagaPage() {
  const params = useParams()
  return <VagaForm mode="edit" vagaId={params.id as string} />
}

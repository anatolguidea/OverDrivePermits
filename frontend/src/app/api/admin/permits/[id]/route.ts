import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePermit, assertValidTransition, findPermitsByOrder } from '@/lib/repositories/permits.repo'
import { updatePermitSchema } from '@/lib/validators/permit.schema'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { getErrorMessage } from '@/lib/errors'
import type { PermitStatus } from '@/lib/supabase/types'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updatePermitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    // Validate status transition if changing status
    if (parsed.data.status) {
      const { data: current } = await supabase
        .from('permits').select('status').eq('id', params.id).single()
      if (current) {
        assertValidTransition(current.status as PermitStatus, parsed.data.status as PermitStatus)
      }
    }

    const data = await updatePermit(supabase, params.id, {
      ...(parsed.data.status        && { status: parsed.data.status }),
      ...(parsed.data.cost          !== undefined && { cost: parsed.data.cost }),
      ...(parsed.data.permit_number !== undefined && { permit_number: parsed.data.permit_number || null }),
      ...(parsed.data.issue_date    !== undefined && { issue_date: parsed.data.issue_date || null }),
    })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 })
  }
}

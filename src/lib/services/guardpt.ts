import {api} from '@/lib/http'


const makeRel = (rel: string): string => `/api/${rel.replace(/^\/|\/$/g, '')}/`



export async function listGuardsWithTarrifs():Promise<any> {
const rel = makeRel('/guards-preperty-tariffs/by_guard/')
try {
    console.debug('[/guards-preperty-tariffs] GET', rel)
    const res = await api.get(rel)
    console.debug('[/guards-preperty-tariffs] listGuardsWithTarrifs', res.status, res.data)
    return res.data
  } catch (err:any) {
    console.error('[/guards-preperty-tariffs] Error fetching guards with tariffs:', err)
    throw err
  }
}

export async function listPropertiesWithTarrifs():Promise<any> {
  const rel = makeRel('/guards-preperty-tariffs/by_property/')
  try {
    console.debug('[/guards-preperty-tariffs] GET', rel)
    const res = await api.get(rel)
    console.debug('[/guards-preperty-tariffs] listPropertiesWithTarrifs', res.status, res.data)
    return res.data
  } catch (err:any) {
    console.error('[/guards-preperty-tariffs] Error fetching properties with tariffs:', err)
    throw err
  }
}


export async function listGuardPropertyTariffs(params?:Record<string,unknown>):Promise<any> {
 const candidates = ['guards-preperty-tariffs']
 for (const candidate of candidates){
    const rel = makeRel(candidate)
    try {
        console.debug
    }
 }
}


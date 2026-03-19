import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
	try {
		const session = await getUserSession(event)
		return {
			code: 0,
			msg: 'ok',
			data: session.user || null,
		}
	}
	catch (e) {
		return {
			code: 401,
			msg: 'unauthorized',
			data: null,
		}
	}
})

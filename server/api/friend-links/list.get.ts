import { friendLinkService } from '~~/server/services/friend-link-service'

export default defineEventHandler(() => friendLinkService.listPublic())

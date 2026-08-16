import {
  buildServiceControlView,
  loadServiceControlContext,
  type ServiceViewOptions
} from '~~/server/services/platform-service-control-context'
import {
  synchronizePlatformServiceConfiguration,
  updatePlatformServiceConfiguration
} from '~~/server/services/platform-service-configuration-service'
import { discoverPlatformService } from '~~/server/services/platform-service-discovery-service'

export const platformServiceControlService = {
  async get(
    upstreamServiceId: string,
    options: ServiceViewOptions = {}
  ) {
    return buildServiceControlView(
      await loadServiceControlContext(upstreamServiceId),
      options
    )
  },

  discover: discoverPlatformService,

  updateConfiguration: updatePlatformServiceConfiguration,

  synchronizeConfiguration: synchronizePlatformServiceConfiguration
}

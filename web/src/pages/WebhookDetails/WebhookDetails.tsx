import React from 'react'
import { Container, PageBody } from '@harnessio/uicore'
import { useGet } from 'restful-react'
import { useGetRepositoryMetadata } from 'hooks/useGetRepositoryMetadata'
import type { OpenapiWebhookType } from 'services/code'
import { useStrings } from 'framework/strings'
import { RepositoryPageHeader } from 'components/RepositoryPageHeader/RepositoryPageHeader'
import { WehookForm } from 'pages/WebhookNew/WehookForm'
import { useAppContext } from 'AppContext'
import { LoadingSpinner } from 'components/LoadingSpinner/LoadingSpinner'

export default function WebhookDetails() {
  const { getString } = useStrings()
  const { routes } = useAppContext()
  const { repoMetadata, error, loading, webhookId, refetch: refreshMetadata } = useGetRepositoryMetadata()
  const {
    data,
    loading: webhookLoading,
    error: webhookError,
    refetch: refetchWebhook
  } = useGet<OpenapiWebhookType>({
    path: `/api/v1/repos/${repoMetadata?.path}/+/webhooks/${webhookId}`,
    lazy: !repoMetadata
  })

  return (
    <Container>
      <RepositoryPageHeader
        repoMetadata={repoMetadata}
        title={getString('webhookDetails')}
        dataTooltipId="webhookDetails"
        extraBreadcrumbLinks={
          repoMetadata && [
            {
              label: getString('webhooks'),
              url: routes.toCODEWebhooks({ repoPath: repoMetadata.path as string })
            }
          ]
        }
      />
      <PageBody
        error={error || webhookError}
        retryOnError={() => (repoMetadata ? refetchWebhook() : refreshMetadata())}>
        <LoadingSpinner visible={loading || webhookLoading} withBorder={!!data && webhookLoading} />

        {repoMetadata && data && <WehookForm isEdit webhook={data} repoMetadata={repoMetadata} />}
      </PageBody>
    </Container>
  )
}

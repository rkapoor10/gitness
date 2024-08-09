/*
 * Copyright 2023 Harness, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useEffect, useMemo, useState } from 'react'
import {
  Container,
  TableV2,
  Text,
  Button,
  ButtonVariation,
  useToaster,
  StringSubstitute,
  Layout
} from '@harnessio/uicore'

import type { CellProps, Column, Renderer, Row, UseExpandedRowProps } from 'react-table'
import { useGet, useMutate } from 'restful-react'
import { Color } from '@harnessio/design-system'
import { Intent } from '@blueprintjs/core'
import { useHistory } from 'react-router-dom'
import { Icon } from '@harnessio/icons'
import { useQueryParams } from 'hooks/useQueryParams'
import { usePageIndex } from 'hooks/usePageIndex'
import {
  getErrorMessage,
  LIST_FETCHING_LIMIT,
  permissionProps,
  type PageBrowserProps,
  ColorName,
  getLabelScope
} from 'utils/Utils'
import { CodeIcon } from 'utils/GitUtils'
import { ResourceListingPagination } from 'components/ResourceListingPagination/ResourceListingPagination'
import { NoResultCard } from 'components/NoResultCard/NoResultCard'
import { useStrings, String } from 'framework/strings'
import { useConfirmAction } from 'hooks/useConfirmAction'
import { OptionsMenuButton } from 'components/OptionsMenuButton/OptionsMenuButton'
import type { TypesLabel, TypesLabelValue } from 'services/code'
import { useAppContext } from 'AppContext'
import { useGetSpaceParam } from 'hooks/useGetSpaceParam'
import { useUpdateQueryParams } from 'hooks/useUpdateQueryParams'
import { LabelTitle, SpaceLabelValuesList } from 'components/Label/Label'
import { LoadingSpinner } from 'components/LoadingSpinner/LoadingSpinner'
import LabelsHeader from './LabelsHeader/LabelsHeader'
import useLabelModal from './LabelModal/LabelModal'
import css from './LabelsListing.module.scss'

interface LabelType extends TypesLabel {
  labelValues?: TypesLabelValue[]
}

const SpaceLabelsListing = (props: { activeTab: string; spaceRef: string | undefined }) => {
  // ToDO : Merge Label Listing is Harness scope permits
  const { activeTab, spaceRef } = props
  const { getString } = useStrings()
  const { showError, showSuccess } = useToaster()
  const history = useHistory()
  const pageBrowser = useQueryParams<PageBrowserProps>()
  const { updateQueryParams, replaceQueryParams } = useUpdateQueryParams()
  const pageInit = pageBrowser.page ? parseInt(pageBrowser.page) : 1
  const [page, setPage] = usePageIndex(pageInit)
  const [searchTerm, setSearchTerm] = useState('')
  const [showParentScopeFilter, setShowParentScopeFilter] = useState<boolean>(false)
  const [inheritLabels, setInheritLabels] = useState<boolean>(false)

  useEffect(() => {
    const params = {
      ...pageBrowser,
      ...(page > 1 && { page: page.toString() })
    }
    updateQueryParams(params, undefined, true)

    if (page <= 1) {
      const updateParams = { ...params }
      delete updateParams.page
      replaceQueryParams(updateParams, undefined, true)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: labelsList,
    loading: labelsListLoading,
    refetch: refetchlabelsList,
    response
  } = useGet<LabelType[]>({
    path: `/api/v1/spaces/${spaceRef}/+/labels`,
    queryParams: {
      limit: LIST_FETCHING_LIMIT,
      inherited: inheritLabels,
      page: page,
      query: searchTerm
    },
    debounce: 500
  })

  useEffect(() => {
    if (labelsList && !labelsListLoading) {
      if (labelsList[0].scope === 1) setShowParentScopeFilter(false)
      else setShowParentScopeFilter(true)
    }
  }, [labelsList])

  const { openModal: openLabelCreateModal, openUpdateLabelModal } = useLabelModal({ refetchlabelsList })
  const renderRowSubComponent = React.useCallback(({ row }: { row: Row<LabelType> }) => {
    return <SpaceLabelValuesList name={row.original?.key as string} spaceRef={spaceRef} scope={row.original.scope} />
  }, [])

  const ToggleAccordionCell: Renderer<{
    row: UseExpandedRowProps<CellProps<LabelType>> & {
      original: LabelType
    }
    value: LabelType
  }> = ({ row }) => {
    if (row.original.value_count) {
      return (
        <Layout.Horizontal onClick={e => e?.stopPropagation()}>
          <Button
            data-testid="row-expand-btn"
            {...row.getToggleRowExpandedProps()}
            color={Color.GREY_600}
            icon={row.isExpanded ? 'chevron-down' : 'chevron-right'}
            variation={ButtonVariation.ICON}
            iconProps={{ size: 19 }}
            className={css.toggleAccordion}
          />
        </Layout.Horizontal>
      )
    }
    return null
  }

  const columns: Column<LabelType>[] = useMemo(
    () => [
      {
        Header: '',
        id: 'rowSelectOrExpander',
        width: '5%',
        Cell: ToggleAccordionCell
      },
      {
        Header: getString('name'),
        id: 'name',
        sort: 'true',
        width: '25%',
        Cell: ({ row }: CellProps<LabelType>) => {
          return (
            <LabelTitle
              name={row.original?.key as string}
              value_count={row.original.value_count}
              label_color={row.original.color as ColorName}
              scope={row.original.scope}
            />
          )
        }
      },
      {
        Header: getString('labels.createdIn'),
        id: 'scope',
        sort: 'true',
        width: '30%',
        Cell: ({ row }: CellProps<LabelType>) => {
          const { message, icon } = getLabelScope(row.original.scope, standalone, undefined, space)
          return (
            <Layout.Horizontal spacing={'xsmall'} flex={{ alignItems: 'center', justifyContent: 'flex-start' }}>
              <Icon size={16} name={icon} />
              <Text>{message}</Text>
            </Layout.Horizontal>
          )
        }
      },
      {
        Header: getString('description'),
        id: 'description',
        width: '40%',
        sort: 'true',
        Cell: ({ row }: CellProps<LabelType>) => {
          return <Text>{row.original?.description}</Text>
        }
      },
      {
        id: 'action',
        width: '5%',
        Cell: ({ row }: CellProps<LabelType>) => {
          // encode this and rest of the url calls
          const encodedLabelKey = row.original.key ? encodeURIComponent(row.original.key) : ''
          const { mutate: deleteLabel } = useMutate({
            verb: 'DELETE',
            path: `/api/v1/spaces/${spaceRef}/+/labels/${encodeURIComponent(encodedLabelKey)}`
          })
          const confirmLabelDelete = useConfirmAction({
            title: getString('labels.deleteLabel'),
            confirmText: getString('confirmDelete'),
            intent: Intent.DANGER,
            message: <String useRichText stringID="deleteTagConfirm" vars={{ name: row.original.key }} />,
            action: async () => {
              deleteLabel({})
                .then(() => {
                  showSuccess(
                    <StringSubstitute
                      str={getString('labels.deleteLabel')}
                      vars={{
                        tag: row.original.key
                      }}
                    />,
                    5000
                  )
                  refetchlabelsList()
                  setPage(1)
                })
                .catch(error => {
                  showError(getErrorMessage(error), 0, 'failedToDeleteTag')
                })
            }
          })
          return (
            <OptionsMenuButton
              width="100px"
              items={[
                {
                  text: 'Edit',
                  iconName: CodeIcon.Edit,
                  hasIcon: true,
                  iconSize: 20,
                  style: { display: 'flex', alignItems: 'center' },
                  onClick: () => {
                    openUpdateLabelModal(row.original)
                  }
                },
                {
                  text: 'Delete',
                  iconName: CodeIcon.Delete,
                  iconSize: 20,
                  hasIcon: true,
                  isDanger: true,
                  style: { display: 'flex', alignItems: 'center' },
                  onClick: confirmLabelDelete
                }
              ]}
              isDark
            />
          )
        }
      }
    ], // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, getString, spaceRef, setPage, showError, showSuccess]
  )
  const { hooks, standalone } = useAppContext()

  const space = useGetSpaceParam()
  const permPushResult = hooks?.usePermissionTranslate?.(
    {
      resource: {
        resourceType: 'CODE_REPOSITORY',
        resourceIdentifier: spaceRef as string
      },
      permissions: ['code_repo_edit']
    },
    [space]
  )
  return (
    <Container>
      {spaceRef && (
        <LabelsHeader
          activeTab={activeTab}
          onSearchTermChanged={(value: React.SetStateAction<string>) => {
            setSearchTerm(value)
            setPage(1)
          }}
          spaceRef={spaceRef}
          refetchlabelsList={refetchlabelsList}
          showParentScopeFilter={showParentScopeFilter}
          inheritLabels={inheritLabels}
          setInheritLabels={setInheritLabels}
        />
      )}

      <Container className={css.main} padding={{ bottom: 'large', right: 'xlarge', left: 'xlarge' }}>
        {labelsList && labelsList.length !== 0 ? (
          <TableV2<LabelType>
            className={css.table}
            columns={columns}
            data={labelsList}
            sortable
            renderRowSubComponent={renderRowSubComponent}
            autoResetExpanded={true}
          />
        ) : (
          <LoadingSpinner visible={true} />
        )}

        <ResourceListingPagination response={response} page={page} setPage={setPage} />
      </Container>

      <NoResultCard
        showWhen={() => labelsList?.length === 0}
        forSearch={!!searchTerm}
        message={getString('labels.noScopeLabelsFound')}
        buttonText={getString('labels.newLabel')}
        onButtonClick={() => openLabelCreateModal()}
        permissionProp={permissionProps(permPushResult, standalone)}
      />
    </Container>
  )
}

export default SpaceLabelsListing

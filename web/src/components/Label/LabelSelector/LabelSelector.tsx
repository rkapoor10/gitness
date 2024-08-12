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

import React, { useEffect, useRef, useState } from 'react'
import {
  Button,
  ButtonProps,
  ButtonSize,
  ButtonVariation,
  Container,
  Layout,
  Tag,
  Text,
  TextInput,
  useToaster
} from '@harnessio/uicore'
import cx from 'classnames'
import { Menu, MenuItem, PopoverPosition } from '@blueprintjs/core'
import { useMutate } from 'restful-react'
import { Render } from 'react-jsx-match'
import { useAppContext } from 'AppContext'
import type { RepoRepositoryOutput, TypesPullReq } from 'services/code'
import { useStrings } from 'framework/strings'
import { ButtonRoleProps, LabelType, getErrorMessage, permissionProps } from 'utils/Utils'
import { useGetSpaceParam } from 'hooks/useGetSpaceParam'
import { Label, LabelTitle } from '../Label'
import css from './LabelSelector.module.scss'

export interface LabelSelectorProps {
  allLabelsData: any
  refetchLabels: () => void
  refetchlabelsList: () => void
  repoMetadata: RepoRepositoryOutput
  pullRequestMetadata: TypesPullReq
}

export interface LabelSelectProps extends Omit<ButtonProps, 'onSelect'> {
  onSelectLabel: (label: any) => void
  onSelectValue: (labelKey: number, valueId: number) => void
  menuState: LabelsMenuState | undefined
  currentLabel: any
  handleValueRemove?: () => void
  addNewValue?: any
  allLabelsData: any
  query: string
  setQuery: any
  menuItemIndex: number
  setMenuItemIndex: any
}

enum LabelsMenuState {
  LABELS = 'labels',
  VALUES = 'label_values'
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({
  allLabelsData,
  refetchLabels,
  pullRequestMetadata,
  repoMetadata,
  refetchlabelsList,
  ...props
}) => {
  const [popoverDialogOpen, setPopoverDialogOpen] = useState<boolean>(false)
  const [menuState, setMenuState] = useState<LabelsMenuState>(LabelsMenuState.LABELS)
  const [menuItemIndex, setMenuItemIndex] = useState<number>(0)
  const [currentLabel, setCurrentLabel] = useState({ key: '', id: -1 })
  const [query, setQuery] = useState('')
  const { getString } = useStrings()

  const { showError, showSuccess } = useToaster()
  const { mutate: updatePRLabels } = useMutate({
    verb: 'PUT',
    path: `/api/v1/repos/${repoMetadata.path}/+/pullreq/${pullRequestMetadata.number}/labels`
  })

  const space = useGetSpaceParam()
  const { hooks, standalone } = useAppContext()
  const permPushResult = hooks?.usePermissionTranslate?.(
    {
      resource: {
        resourceType: 'CODE_REPOSITORY',

        resourceIdentifier: repoMetadata?.identifier as string
      },

      permissions: ['code_repo_edit']
    },

    [space]
  )

  return (
    <Button
      className={css.addLabelBtn}
      text={<span className={css.prefix}>{getString('add')}</span>}
      variation={ButtonVariation.TERTIARY}
      minimal
      size={ButtonSize.SMALL}
      tooltip={
        <PopoverContent
          onSelectLabel={label => {
            setCurrentLabel(label)
            if (label.values?.length || label.type === LabelType.DYNAMIC) {
              setMenuState(LabelsMenuState.VALUES)
              setMenuItemIndex(0)
            } else {
              try {
                updatePRLabels({
                  label_id: label.id
                })
                  .then(() => {
                    refetchLabels()
                    refetchlabelsList()
                    setPopoverDialogOpen(false)
                  })
                  .catch(error => showError(getErrorMessage(error)))
              } catch (exception) {
                showError(getErrorMessage(exception))
              }
            }
          }}
          onSelectValue={(labelKey, valueId) => {
            setMenuState(LabelsMenuState.VALUES)
            setMenuItemIndex(0)
            try {
              updatePRLabels({
                label_id: labelKey,
                value_id: valueId
              })
                .then(() => {
                  refetchLabels()
                  setMenuState(LabelsMenuState.LABELS)
                  setMenuItemIndex(0)
                  setCurrentLabel({ key: '', id: -1 })
                  setPopoverDialogOpen(false)
                })
                .catch(error => showError(getErrorMessage(error)))
            } catch (exception) {
              showError(getErrorMessage(exception))
            }
          }}
          allLabelsData={allLabelsData}
          menuState={menuState}
          currentLabel={currentLabel}
          addNewValue={() => {
            try {
              updatePRLabels({
                label_id: currentLabel.id,
                value: query
              })
                .then(() => {
                  showSuccess(`Updated ${currentLabel.key} with ${query}`)
                  refetchLabels()
                  refetchlabelsList()
                  setMenuState(LabelsMenuState.LABELS)
                  setMenuItemIndex(0)
                  setCurrentLabel({ key: '', id: -1 })
                  setPopoverDialogOpen(false)
                  setQuery('')
                })
                .catch(error => showError(getErrorMessage(error)))
            } catch (exception) {
              showError(getErrorMessage(exception))
            }
          }}
          query={query}
          setQuery={setQuery}
          handleValueRemove={() => {
            setMenuState(LabelsMenuState.LABELS)
            setMenuItemIndex(0)
            setCurrentLabel({ key: '', id: -1 })
          }}
          menuItemIndex={menuItemIndex}
          setMenuItemIndex={setMenuItemIndex}
        />
      }
      tooltipProps={{
        interactionKind: 'click',
        usePortal: true,
        position: PopoverPosition.BOTTOM_RIGHT,
        popoverClassName: css.popover,
        isOpen: popoverDialogOpen,
        onInteraction: nxtState => setPopoverDialogOpen(nxtState)
      }}
      tabIndex={0}
      {...props}
      {...permissionProps(permPushResult, standalone)}
    />
  )
}

const PopoverContent: React.FC<LabelSelectProps> = ({
  onSelectLabel,
  onSelectValue,
  menuState,
  currentLabel,
  handleValueRemove,
  allLabelsData,
  addNewValue,
  query,
  setQuery,
  menuItemIndex,
  setMenuItemIndex
}) => {
  const inputRef = useRef<HTMLInputElement | null>()
  // const colorObj = getColorsObj(currentLabel?.label_color ? currentLabel.label_color : ColorName.Blue)

  const filterLabels = (labelQuery: string) => {
    if (!labelQuery) return allLabelsData.label_data // If no query, return all names
    const lowerCaseQuery = labelQuery.toLowerCase()
    return allLabelsData.label_data.filter((label: any) => label.key.toLowerCase().includes(lowerCaseQuery))
  }

  const filteredLabelValues = (valueQuery: string) => {
    if (!valueQuery) return currentLabel?.values // If no query, return all names
    const lowerCaseQuery = valueQuery.toLowerCase()
    return currentLabel?.values?.filter((label: any) => label.value?.toLowerCase().includes(lowerCaseQuery))
  }

  const labelsValueList = filteredLabelValues(query)
  const labelsList = filterLabels(query)

  useEffect(() => {
    if (menuState === LabelsMenuState.LABELS && menuItemIndex > 0)
      document
        .getElementById(labelsList[menuItemIndex - 1].key + labelsList[menuItemIndex - 1].id)
        ?.scrollIntoView({ behavior: 'auto', block: 'center' })
    else if (menuState === LabelsMenuState.VALUES && menuItemIndex > 0)
      document
        .getElementById(labelsValueList[menuItemIndex - 1].key + labelsValueList[menuItemIndex - 1].id)
        ?.scrollIntoView({ behavior: 'auto', block: 'center' })
  }, [menuItemIndex, menuState])

  const handleKeyDownLabels: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (labelsList && labelsList.length !== 0) {
      switch (e.key) {
        case 'ArrowDown':
          setMenuItemIndex((index: number) => {
            return index + 1 > labelsList.length ? 1 : index + 1
          })
          break
        case 'ArrowUp':
          setMenuItemIndex((index: number) => {
            return index - 1 > 0 ? index - 1 : labelsList.length
          })
          break
        case 'Enter':
          if (labelsList[menuItemIndex - 1]) {
            onSelectLabel(labelsList[menuItemIndex - 1])
            setQuery('')
          }
          break
        default:
          break
      }
    }
  }

  const handleKeyDownValue: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Backspace' && !query && currentLabel) {
      setQuery('')
      handleValueRemove && handleValueRemove()
    } else if (labelsValueList && labelsValueList.length !== 0) {
      switch (e.key) {
        case 'ArrowDown':
          setMenuItemIndex((index: number) => {
            return index + 1 > labelsValueList.length ? 1 : index + 1
          })
          break
        case 'ArrowUp':
          setMenuItemIndex((index: number) => {
            return index - 1 > 0 ? index - 1 : labelsValueList.length
          })
          break
        case 'Enter':
          onSelectValue(currentLabel.id, labelsValueList[menuItemIndex - 1].id)
          setQuery('')
          break
        default:
          break
      }
    }
  }

  return (
    <Container padding="small" className={css.main}>
      <Layout.Vertical className={css.layout}>
        {menuState === LabelsMenuState.LABELS ? (
          <TextInput
            className={css.input}
            wrapperClassName={css.inputBox}
            value={query}
            inputRef={ref => (inputRef.current = ref)}
            defaultValue={query}
            autoFocus
            placeholder={'Find a label'}
            onInput={e => {
              const _value = e.currentTarget.value || ''
              setQuery(_value)
            }}
            rightElement={query ? 'code-close' : undefined}
            rightElementProps={{
              onClick: () => setQuery(''),
              style: { cursor: 'pointer', margin: '5px 2.5px' },
              size: 20
            }}
            onKeyDown={handleKeyDownLabels}
          />
        ) : (
          currentLabel &&
          handleValueRemove && (
            <Layout.Horizontal flex={{ alignItems: 'center' }} className={css.labelSearch}>
              <Label name={currentLabel.key} label_color={currentLabel.color} scope={currentLabel.scope} />
              <TextInput
                className={css.input}
                onKeyDown={handleKeyDownValue}
                wrapperClassName={css.inputBox}
                value={query}
                inputRef={ref => (inputRef.current = ref)}
                defaultValue={query}
                autoFocus
                placeholder={currentLabel.type === LabelType.STATIC ? 'Find a value' : 'Find or add a new value'}
                onInput={e => {
                  const _value = e.currentTarget.value || ''
                  setQuery(_value)
                }}
                rightElement={query || currentLabel?.key ? 'code-close' : undefined}
                rightElementProps={{
                  onClick: () => {
                    setQuery('')
                    handleValueRemove()
                  },
                  style: { cursor: 'pointer', margin: '5px 2.5px' },
                  size: 20
                }}
              />
            </Layout.Horizontal>
          )
        )}

        <Container className={cx(css.menuContainer)}>
          <LabelList
            onSelectLabel={onSelectLabel}
            onSelectValue={onSelectValue}
            query={query}
            setQuery={setQuery}
            menuState={menuState}
            currentLabel={currentLabel}
            allLabelsData={labelsList}
            menuItemIndex={menuItemIndex}
            addNewValue={addNewValue}
            setMenuItemIndex={setMenuItemIndex}
          />
        </Container>
      </Layout.Vertical>
    </Container>
  )
}

interface LabelListProps extends LabelSelectProps {
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  menuItemIndex: number
}

const LabelList = ({
  onSelectLabel,
  onSelectValue,
  query,
  setQuery,
  menuState,
  currentLabel,
  allLabelsData: labelsList,
  menuItemIndex,
  addNewValue
}: LabelListProps) => {
  const { getString } = useStrings()
  if (menuState === LabelsMenuState.LABELS) {
    if (labelsList.length) {
      return (
        <Menu className={css.labelMenu}>
          {labelsList?.map((label: any, index: number) => {
            return (
              <MenuItem
                key={label.key + label.id}
                id={label.key + label.id}
                className={cx(css.menuItem, {
                  [css.selected]: index === menuItemIndex - 1
                })}
                text={
                  <LabelTitle
                    name={label.key}
                    value_count={label.values?.length}
                    label_color={label.color}
                    scope={label.scope}
                  />
                }
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectLabel(label)
                  setQuery('')
                }}
                {...ButtonRoleProps}
              />
            )
          })}
        </Menu>
      )
    } else {
      return (
        <Container flex={{ align: 'center-center' }} padding="large">
          {
            <Text className={css.noWrapText} flex padding={{ top: 'small' }}>
              <span>
                {query && <Tag> {query} </Tag>} {getString('labels.labelNotFound')}
              </span>
            </Text>
          }
        </Container>
      )
    }
  } else {
    const filteredLabelValues = (filterQuery: string) => {
      if (!filterQuery) return currentLabel?.values // If no query, return all names
      const lowerCaseQuery = filterQuery.toLowerCase()
      return currentLabel?.values?.filter((label: any) => label.value?.toLowerCase().includes(lowerCaseQuery))
    }
    const exactMatchFound = (list: any[], exactQuery: string) => {
      const res = list ? list?.map((ele: any) => ele.value)?.includes(exactQuery) : false
      return res
    }
    const labelsValueList = filteredLabelValues(query)
    return (
      <Menu className={css.labelMenu}>
        <Render when={labelsValueList && currentLabel}>
          {labelsValueList?.map((labelValue: { value: any; color: any; id: number }, index: number) => (
            <MenuItem
              key={index}
              className={cx(css.menuItem, {
                [css.selected]: index === menuItemIndex - 1
              })}
              text={
                <Label
                  name={currentLabel.key}
                  label_color={currentLabel.color}
                  label_value={{ name: labelValue.value, color: labelValue.color }}
                  scope={currentLabel.scope}
                />
              }
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onSelectValue(currentLabel.id, labelValue.id)
                setQuery('')
              }}
              {...ButtonRoleProps}
            />
          ))}
        </Render>
        <Render when={currentLabel.type === LabelType.DYNAMIC && !exactMatchFound(labelsValueList, query) && query}>
          <Button
            variation={ButtonVariation.LINK}
            className={css.noWrapText}
            flex
            padding={{ top: 'small', left: 'small' }}
            onClick={() => addNewValue()}>
            <span className={css.valueNotFound}>
              {getString('labels.addNewValue')}
              {currentLabel && <Label name={'...'} label_color={currentLabel.color} label_value={{ name: query }} />}
            </span>
          </Button>
        </Render>
        <Render when={labelsValueList?.length === 0 && currentLabel?.type === LabelType.STATIC}>
          <Text className={css.noWrapText} flex padding={{ top: 'small', left: 'small' }}>
            <span>
              {currentLabel && query && (
                <Label
                  name={currentLabel?.key}
                  label_color={currentLabel.color}
                  label_value={{ name: query }}
                  scope={currentLabel.scope}
                />
              )}
              {getString('labels.labelNotFound')}
            </span>
          </Text>
        </Render>
      </Menu>
    )
  }
}

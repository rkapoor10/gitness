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

import React, { useState } from 'react'
import {
  Container,
  Layout,
  FlexExpander,
  DropDown,
  ButtonVariation,
  Button,
  Text,
  SelectOption,
  useToaster
} from '@harnessio/uicore'
import cx from 'classnames'
import { Icon } from '@harnessio/icons'
import { Color, FontVariation } from '@harnessio/design-system'
import { Menu, MenuItem, PopoverInteractionKind, PopoverPosition, Spinner } from '@blueprintjs/core'
import { noop } from 'lodash-es'
import { getConfig, getUsingFetch } from 'services/config'
import type { TypesLabel, TypesLabelValue } from 'services/code'
import { ColorName, LIST_FETCHING_LIMIT, getErrorMessage } from 'utils/Utils'
import { useStrings } from 'framework/strings'
import { Label, LabelTitle } from '../Label'
import css from './LabelFilter.module.scss'

export const LabelFilter = (props: {
  labelFilterOption: any
  setLabelFilterOption: any
  onPullRequestLabelFilterChanged: any
  bearerToken: any
  repoMetadata: any
  spaceRef: string
}) => {
  const {
    labelFilterOption,
    setLabelFilterOption,
    onPullRequestLabelFilterChanged,
    bearerToken,
    repoMetadata,
    spaceRef
  } = props
  const { showError } = useToaster()
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [loadingLabelValues, setLoadingLabelValues] = useState(false)
  const [labelValues, setLabelValues] = useState<SelectOption[]>()
  const [labelQuery, setLabelQuery] = useState<string>('')
  const [highlightItem, setHighlightItem] = useState('')
  const { getString } = useStrings()
  const getLabelsPromise = async (): Promise<SelectOption[]> => {
    setLoadingLabels(true)
    try {
      const fetchedLabels: TypesLabel[] = await getUsingFetch(
        getConfig('code/api/v1'),
        `/repos/${repoMetadata?.path}/+/labels`,
        bearerToken,
        {
          queryParams: {
            page: 1,
            limit: LIST_FETCHING_LIMIT,
            inherited: true,
            query: labelQuery?.trim(),
            debounce: 500
          }
        }
      )
      const updatedLabelsList = Array.isArray(fetchedLabels)
        ? ([
            ...(fetchedLabels || []).map(item => ({
              label: JSON.stringify(item),
              value: String(item?.id)
            }))
          ] as SelectOption[])
        : ([] as SelectOption[])
      setLoadingLabels(false)
      return updatedLabelsList
    } catch (error) {
      setLoadingLabels(false)
      throw error
    }
  }

  const getLabelValuesPromise = async (key: string, scope: number): Promise<SelectOption[]> => {
    setLoadingLabelValues(true)
    if (scope === 0) {
      try {
        const fetchedValues: TypesLabelValue[] = await getUsingFetch(
          getConfig('code/api/v1'),
          `/repos/${repoMetadata?.path}/+/labels/${encodeURIComponent(key)}/values`,
          bearerToken,
          {}
        )
        const updatedValuesList = Array.isArray(fetchedValues)
          ? ([
              ...(fetchedValues || []).map(item => ({
                label: JSON.stringify(item),
                value: String(item?.id)
              }))
            ] as SelectOption[])
          : ([] as SelectOption[])
        setLoadingLabelValues(false)
        return updatedValuesList
      } catch (error) {
        setLoadingLabelValues(false)
        throw error
      }
    } else {
      try {
        const fetchedValues: TypesLabelValue[] = await getUsingFetch(
          getConfig('code/api/v1'),
          `/spaces/${spaceRef}/+/labels/${encodeURIComponent(key)}/values`,
          bearerToken,
          {}
        )
        const updatedValuesList = Array.isArray(fetchedValues)
          ? ([
              ...(fetchedValues || []).map(item => ({
                label: JSON.stringify(item),
                value: String(item?.id)
              }))
            ] as SelectOption[])
          : ([] as SelectOption[])
        setLoadingLabelValues(false)
        return updatedValuesList
      } catch (error) {
        setLoadingLabelValues(false)
        throw error
      }
    }
  }

  const containsFilter = (
    filterObjArr: {
      labelId: number
      valueId: number | undefined
      type: 'label' | 'value'
      labelObj: TypesLabel
      valueObj: TypesLabelValue | undefined
    }[],
    currentObj: any,
    type: 'label' | 'value' | 'forValue'
  ) => {
    let res = false
    if (type === 'label') {
      res = filterObjArr.some(
        filterObj =>
          filterObj.labelId === currentObj.id && filterObj.valueId === undefined && filterObj.type === 'label'
      )
    } else if (type === 'value') {
      res = filterObjArr.some(
        filterObj =>
          filterObj.labelId === currentObj.label_id && filterObj.valueId === currentObj.id && filterObj.type === 'value'
      )
    } else if (type === 'forValue') {
      res = filterObjArr.some(
        filterObj =>
          filterObj.labelId === currentObj.id && filterObj.valueId !== undefined && filterObj.type === 'value'
      )
    }
    return res
  }

  const replaceValueFilter = (
    filterObjArr: {
      labelId: number
      valueId: number | undefined
      type: 'label' | 'value'
      labelObj: TypesLabel
      valueObj: TypesLabelValue | undefined
    }[],
    currentObj: any
  ) => {
    const updateFilterObjArr = filterObjArr.map(filterObj => {
      if (filterObj.labelId === currentObj.label_id && filterObj.type === 'value') {
        return { ...filterObj, valueId: currentObj.id, valueObj: currentObj }
      }
      return filterObj
    })
    onPullRequestLabelFilterChanged([...updateFilterObjArr])
    setLabelFilterOption([...updateFilterObjArr])
  }

  const removeValueFromFilter = (
    filterObjArr: {
      labelId: number
      valueId: number | undefined
      type: 'label' | 'value'
      labelObj: TypesLabel
      valueObj: TypesLabelValue | undefined
    }[],
    currentObj: any
  ) => {
    const updateFilterObjArr = filterObjArr.filter(filterObj => {
      if (!(filterObj.labelId === currentObj.label_id && filterObj.type === 'value')) {
        return filterObj
      }
    })
    onPullRequestLabelFilterChanged(updateFilterObjArr)
    setLabelFilterOption(updateFilterObjArr)
  }

  const removeLabelFromFilter = (
    filterObjArr: {
      labelId: number
      valueId: number | undefined
      type: 'label' | 'value'
      labelObj: TypesLabel
      valueObj: TypesLabelValue | undefined
    }[],
    currentObj: any
  ) => {
    const updateFilterObjArr = filterObjArr.filter(filterObj => {
      if (!(filterObj.labelId === currentObj.id && filterObj.type === 'label')) {
        return filterObj
      }
    })
    onPullRequestLabelFilterChanged(updateFilterObjArr)
    setLabelFilterOption(updateFilterObjArr)
  }

  return (
    <DropDown
      value={{
        label: labelFilterOption.length,
        value: labelFilterOption.length
      }}
      items={() => getLabelsPromise()}
      disabled={loadingLabels}
      onChange={noop}
      popoverClassName={css.labelDropdownPopover}
      icon={labelFilterOption?.length > 0 ? undefined : 'code-tag'}
      iconProps={{ size: 16 }}
      placeholder="Filter by Label/s"
      resetOnClose
      resetOnSelect
      resetOnQuery
      query={labelQuery}
      onQueryChange={newQuery => {
        setLabelQuery(newQuery)
      }}
      itemRenderer={(item, { handleClick }) => {
        const itemObj = JSON.parse(item.label)
        const offsetValue = containsFilter(labelFilterOption, itemObj, 'forValue')
        const offsetLabel = containsFilter(labelFilterOption, itemObj, 'label')
        return (
          <Container className={cx(css.labelCtn, { [css.highlight]: highlightItem === item.label })}>
            {itemObj.value_count ? (
              <Button
                className={css.labelBtn}
                text={
                  labelFilterOption?.length ? (
                    <Layout.Horizontal
                      className={css.offsetcheck}
                      spacing={'small'}
                      flex={{ alignItems: 'center', justifyContent: 'space-between' }}
                      width={'100%'}>
                      <Icon name={'tick'} size={16} style={{ opacity: offsetValue ? 1 : 0 }} />
                      <FlexExpander />
                      <LabelTitle
                        name={itemObj?.key as string}
                        value_count={itemObj.value_count}
                        label_color={itemObj.color as ColorName}
                        scope={itemObj.scope}
                      />
                    </Layout.Horizontal>
                  ) : (
                    <LabelTitle
                      name={itemObj?.key as string}
                      value_count={itemObj.value_count}
                      label_color={itemObj.color as ColorName}
                      scope={itemObj.scope}
                    />
                  )
                }
                rightIcon={'chevron-right'}
                iconProps={{ size: 16 }}
                variation={ButtonVariation.LINK}
                onClick={() => {
                  setHighlightItem(item.label as string)
                  getLabelValuesPromise(itemObj.key, itemObj.scope)
                    .then(res => setLabelValues(res))
                    .catch(err => {
                      showError(getErrorMessage(err))
                    })
                }}
                tooltip={
                  labelValues && !loadingLabelValues ? (
                    <Menu key={itemObj.id} className={css.childBox}>
                      {labelValues.map(value => {
                        const valueObj = JSON.parse(value.label)
                        const currentMarkedValue = containsFilter(labelFilterOption, valueObj, 'value')
                        return (
                          <MenuItem
                            key={itemObj.key + (value.value as string) + 'menu'}
                            onClick={event => {
                              if (offsetValue) {
                                if (currentMarkedValue) {
                                  removeValueFromFilter(labelFilterOption, valueObj)
                                } else {
                                  replaceValueFilter(labelFilterOption, valueObj)
                                }
                              } else {
                                onPullRequestLabelFilterChanged([
                                  ...labelFilterOption,
                                  {
                                    labelId: valueObj.label_id,
                                    valueId: valueObj.id,
                                    type: 'value',
                                    labelObj: itemObj,
                                    valueObj: valueObj
                                  }
                                ])
                                setLabelFilterOption([
                                  ...labelFilterOption,
                                  {
                                    labelId: valueObj.label_id,
                                    valueId: valueObj.id,
                                    type: 'value',
                                    labelObj: itemObj,
                                    valueObj: valueObj
                                  }
                                ])
                              }

                              handleClick(event)
                            }}
                            className={cx(css.menuItem)}
                            text={
                              offsetValue ? (
                                <Layout.Horizontal
                                  className={css.offsetcheck}
                                  spacing={'small'}
                                  flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
                                  width={'100%'}>
                                  <Icon
                                    name={'tick'}
                                    size={16}
                                    color={Color.PRIMARY_7}
                                    style={{ opacity: currentMarkedValue ? 1 : 0 }}
                                  />
                                  <Label
                                    key={itemObj.key + (value.value as string)}
                                    name={itemObj.key}
                                    label_value={{ name: valueObj.value, color: valueObj.color as ColorName }}
                                    scope={itemObj.scope}
                                  />
                                </Layout.Horizontal>
                              ) : (
                                <Label
                                  key={itemObj.key + (value.value as string)}
                                  name={itemObj.key}
                                  label_value={{ name: valueObj.value, color: valueObj.color as ColorName }}
                                  scope={itemObj.scop}
                                />
                              )
                            }
                          />
                        )
                      })}
                    </Menu>
                  ) : (
                    <Menu className={css.menuItem} style={{ justifyContent: 'center' }}>
                      <Spinner size={20} />
                    </Menu>
                  )
                }
                tooltipProps={{
                  interactionKind: PopoverInteractionKind.CLICK,
                  position: PopoverPosition.RIGHT,
                  popoverClassName: css.popover,
                  modifiers: { preventOverflow: { boundariesElement: 'viewport' } }
                }}
              />
            ) : (
              <Container
                onClick={event => {
                  handleClick(event)
                  if (offsetLabel) removeLabelFromFilter(labelFilterOption, itemObj)
                  else {
                    onPullRequestLabelFilterChanged([
                      ...labelFilterOption,
                      {
                        labelId: itemObj.id,
                        valueId: undefined,
                        type: 'label',
                        labelObj: itemObj,
                        valueObj: undefined
                      }
                    ])

                    setLabelFilterOption([
                      ...labelFilterOption,
                      {
                        labelId: itemObj.id,
                        valueId: undefined,
                        type: 'label',
                        labelObj: itemObj,
                        valueObj: undefined
                      }
                    ])
                  }
                }}>
                <Button
                  className={css.labelBtn}
                  text={
                    labelFilterOption.length ? (
                      <Layout.Horizontal
                        className={css.offsetcheck}
                        spacing={'small'}
                        flex={{ alignItems: 'center', justifyContent: 'space-between' }}
                        width={'100%'}>
                        <Icon name={'tick'} size={16} style={{ opacity: offsetLabel ? 1 : 0 }} />
                        <FlexExpander />
                        <LabelTitle
                          name={itemObj?.key as string}
                          value_count={itemObj.value_count}
                          label_color={itemObj.color as ColorName}
                          scope={itemObj.scope}
                        />
                      </Layout.Horizontal>
                    ) : (
                      <Layout.Horizontal>
                        <LabelTitle
                          name={itemObj?.key as string}
                          value_count={itemObj.value_count}
                          label_color={itemObj.color as ColorName}
                          scope={itemObj.scope}
                        />
                      </Layout.Horizontal>
                    )
                  }
                  variation={ButtonVariation.LINK}
                />
              </Container>
            )}
          </Container>
        )
      }}
      getCustomLabel={() => {
        return (
          <Layout.Horizontal spacing="small" flex={{ alignItems: 'center' }}>
            <Text className={css.counter}>{labelFilterOption.length}</Text>
            <Text color={Color.GREY_900} font={{ variation: FontVariation.BODY }}>
              {getString('labels.labelsApplied')}
            </Text>
          </Layout.Horizontal>
        )
      }}
    />
  )
}

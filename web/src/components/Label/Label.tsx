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

import React from 'react'
import cx from 'classnames'
import { Button, ButtonSize, ButtonVariation, Container, Layout, Tag, Text } from '@harnessio/uicore'
import { FontVariation } from '@harnessio/design-system'
import { useGet } from 'restful-react'
import { Menu } from '@blueprintjs/core'
import { Icon } from '@harnessio/icons'
import { ColorName, getColorsObj, getScopeIcon } from 'utils/Utils'
import type { RepoRepositoryOutput, TypesLabelValue } from 'services/code'
import { useStrings } from 'framework/strings'
import { useAppContext } from 'AppContext'
import css from './Label.module.scss'

interface LabelValuesListProps {
  name: string
  scope?: number
  value_type?: string
  label_value?: {
    name?: string | undefined
    color?: ColorName | undefined
  }[]
  description?: string
  label_color?: ColorName
  value_count?: number
  valuesList?: TypesLabelValue[]
  repoMetadata?: RepoRepositoryOutput | undefined
  spaceRef?: string
}

interface LabelProps {
  name: string
  scope?: number
  value_type?: string
  label_value?: {
    name?: string | undefined
    color?: ColorName | undefined
  }
  description?: string
  label_color?: ColorName
  className?: string
  removeLabelBtn?: boolean
  handleRemoveClick?: () => void
  onClick?: () => void
  disableRemoveBtnTooltip?: boolean
}

export const Label: React.FC<LabelProps> = props => {
  const {
    name,
    scope,
    label_value,
    label_color,
    className,
    removeLabelBtn,
    handleRemoveClick,
    onClick,
    disableRemoveBtnTooltip = false
  } = props
  const { getString } = useStrings()
  const { standalone } = useAppContext()
  if (label_value?.name) {
    const colorObj = getColorsObj(label_value.color ? label_value.color : label_color ? label_color : ColorName.Blue)
    const scopeIcon = getScopeIcon(scope, standalone)
    return (
      <Tag
        onClick={e => {
          if (onClick) {
            onClick()
            e.stopPropagation()
          }
        }}
        className={cx(css.labelTag, className, { [css.removeBtnTag]: removeLabelBtn })}>
        <Layout.Horizontal flex={{ alignItems: 'center' }}>
          <Container
            style={{
              border: `1px solid ${colorObj.stroke}`
            }}
            className={css.labelKey}>
            {scopeIcon && (
              <Icon
                name={scopeIcon}
                size={12}
                style={{
                  color: `${colorObj.text}`
                }}
              />
            )}
            <Text
              style={{
                color: `${colorObj.text}`
              }}
              font={{ variation: FontVariation.SMALL_SEMI }}
              lineClamp={1}>
              {name}
            </Text>
          </Container>
          <Layout.Horizontal
            className={css.labelValue}
            style={{
              backgroundColor: `${colorObj.backgroundWithoutStroke}`
            }}
            flex={{ alignItems: 'center' }}>
            <Text
              style={{
                color: `${colorObj.text}`,
                backgroundColor: `${colorObj.backgroundWithoutStroke}`
              }}
              lineClamp={1}
              font={{ variation: FontVariation.SMALL_SEMI }}>
              {label_value.name}
            </Text>
            {removeLabelBtn && (
              <Button
                variation={ButtonVariation.ICON}
                minimal
                icon="main-close"
                role="close"
                color={colorObj.backgroundWithoutStroke}
                iconProps={{ size: 8 }}
                size={ButtonSize.SMALL}
                onClick={() => {
                  if (handleRemoveClick && disableRemoveBtnTooltip) handleRemoveClick()
                }}
                tooltip={
                  <Menu style={{ minWidth: 'unset' }}>
                    <Menu.Item
                      text={getString('labels.removeLabel')}
                      key={getString('labels.removeLabel')}
                      className={cx(css.danger, css.isDark)}
                      onClick={handleRemoveClick}
                    />
                  </Menu>
                }
                tooltipProps={{ disabled: disableRemoveBtnTooltip, interactionKind: 'click', isDark: true }}
              />
            )}
          </Layout.Horizontal>
        </Layout.Horizontal>
      </Tag>
    )
  } else {
    const colorObj = getColorsObj(label_color ? label_color : ColorName.Blue)
    return (
      <Tag
        onClick={e => {
          if (onClick) {
            onClick()
            e.stopPropagation()
          }
        }}
        className={cx(css.labelTag, className, { [css.removeBtnTag]: removeLabelBtn })}>
        <Layout.Horizontal
          className={css.standaloneKey}
          flex={{ alignItems: 'center' }}
          style={{
            color: `${colorObj.text}`,
            border: `1px solid ${colorObj.stroke}`
          }}>
          <Text
            style={{
              color: `${colorObj.text}`
            }}
            lineClamp={1}
            font={{ variation: FontVariation.SMALL_SEMI }}>
            {name}
          </Text>
          {removeLabelBtn && (
            <Button
              variation={ButtonVariation.ICON}
              minimal
              icon="main-close"
              role="close"
              color={colorObj.backgroundWithoutStroke}
              iconProps={{ size: 8 }}
              size={ButtonSize.SMALL}
              onClick={() => {
                if (handleRemoveClick && disableRemoveBtnTooltip) handleRemoveClick()
              }}
              tooltip={
                <Menu style={{ minWidth: 'unset' }}>
                  <Menu.Item
                    text={getString('labels.removeLabel')}
                    key={getString('labels.removeLabel')}
                    className={cx(css.danger, css.isDark)}
                    onClick={handleRemoveClick}
                  />
                </Menu>
              }
              tooltipProps={{ disabled: disableRemoveBtnTooltip, interactionKind: 'click', isDark: true }}
            />
          )}
        </Layout.Horizontal>
      </Tag>
    )
  }
}

export const LabelTitle: React.FC<LabelValuesListProps> = props => {
  const { name, scope, label_color, value_count } = props
  const { standalone } = useAppContext()
  const colorObj = getColorsObj(label_color ? label_color : ColorName.Blue)
  const scopeIcon = getScopeIcon(scope, standalone)
  if (value_count) {
    return (
      <Tag className={css.labelTag}>
        <Layout.Horizontal flex={{ alignItems: 'center' }}>
          <Container
            style={{
              border: `1px solid ${colorObj.stroke}`
            }}
            className={css.labelKey}>
            {scopeIcon && (
              <Icon
                style={{
                  color: `${colorObj.text}`
                }}
                name={scopeIcon}
                size={12}
              />
            )}
            <Text
              style={{
                color: `${colorObj.text}`
              }}
              lineClamp={1}
              font={{ variation: FontVariation.SMALL_SEMI }}>
              {name}
            </Text>
          </Container>
          <Text
            style={{
              color: `${colorObj.text}`,
              backgroundColor: `${colorObj.backgroundWithoutStroke}`
            }}
            className={css.labelValue}
            font={{ variation: FontVariation.SMALL_SEMI }}>
            ...({value_count})
          </Text>
        </Layout.Horizontal>
      </Tag>
    )
  } else {
    return (
      <Tag className={css.labelTag}>
        <Text
          style={{
            color: `${colorObj.text}`,
            border: `1px solid ${colorObj.stroke}`
          }}
          className={css.standaloneKey}
          lineClamp={1}
          font={{ variation: FontVariation.SMALL_SEMI }}>
          {name}
        </Text>
      </Tag>
    )
  }
}

export const LabelValuesList: React.FC<LabelValuesListProps> = props => {
  const { name, repoMetadata, scope } = props

  const { data: labelValues } = useGet<TypesLabelValue[]>({
    path: `/api/v1/repos/${repoMetadata?.path}/+/labels/${encodeURIComponent(name)}/values`
  })

  return (
    <Layout.Horizontal style={{ flexWrap: 'wrap', gap: '7px', width: '100%' }}>
      {labelValues?.map(value => {
        return (
          <Label
            key={name + value.value}
            name={name}
            scope={scope}
            label_value={{ name: value.value, color: value.color as ColorName }}
          />
        )
      })}
    </Layout.Horizontal>
  )
}

export const SpaceLabelValuesList: React.FC<LabelValuesListProps> = props => {
  const { name, spaceRef, scope } = props

  const {
    data: labelValues
    // loading: valueListLoading,
    // refetch: refetchValuesList
  } = useGet<TypesLabelValue[]>({
    path: `/api/v1/spaces/${spaceRef}/+/labels/${encodeURIComponent(name)}/values`
  })

  return (
    <Layout.Horizontal style={{ flexWrap: 'wrap', gap: '7px', width: '100%' }}>
      {labelValues?.map(value => {
        return (
          <Label
            key={name + value.value}
            name={name}
            label_value={{ name: value.value, color: value.color as ColorName }}
            scope={scope}
          />
        )
      })}
    </Layout.Horizontal>
  )
}

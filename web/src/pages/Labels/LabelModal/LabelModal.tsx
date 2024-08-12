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
  Button,
  ButtonVariation,
  Dialog,
  Layout,
  Text,
  Container,
  useToaster,
  Formik,
  FormInput,
  Popover,
  ButtonSize,
  FlexExpander,
  FormikForm
} from '@harnessio/uicore'
import { Icon } from '@harnessio/icons'
import { Color, FontVariation } from '@harnessio/design-system'
import { Menu, MenuItem, PopoverInteractionKind, Position } from '@blueprintjs/core'
import * as Yup from 'yup'
import { FieldArray } from 'formik'
import { useGet, useMutate } from 'restful-react'
import { Render } from 'react-jsx-match'
import { useModalHook } from 'hooks/useModalHook'
import { useStrings } from 'framework/strings'
import { useGetRepositoryMetadata } from 'hooks/useGetRepositoryMetadata'
import { CodeIcon } from 'utils/GitUtils'
import { colorsPannel, ColorName, ColorDetails, getErrorMessage, LabelType } from 'utils/Utils'
import { Label } from 'components/Label/Label'
import type {
  EnumLabelColor,
  TypesLabel,
  TypesLabelValue,
  TypesSaveLabelInput,
  TypesSaveLabelValueInput
} from 'services/code'
import css from './LabelModal.module.scss'

const enum ModalMode {
  SAVE,
  UPDATE
}
interface ExtendedTypesLabelValue extends TypesLabelValue {
  color: ColorName
}

interface LabelModalProps {
  refetchlabelsList: () => void
}
interface UpdateLabelType extends TypesLabel {
  labelValues?: TypesLabelValue[]
}
interface LabelFormData extends TypesLabel {
  labelName: string
  allowDynamicValues: boolean
  color: ColorName
  labelValues: ExtendedTypesLabelValue[]
}

const ColorSelectorDropdown = (props: {
  onClick: any
  currentColorName: ColorName | undefined | false
  disabled?: boolean
}) => {
  const { currentColorName, onClick: onClickColorOption, disabled: disabledPopover } = props

  const colorNames: ColorName[] = Object.keys(colorsPannel) as ColorName[]
  const getColorsObj = (colorKey: ColorName): ColorDetails => {
    return colorsPannel[colorKey]
  }

  const currentColorObj = getColorsObj(currentColorName ? currentColorName : ColorName.Blue)

  return (
    <Popover
      minimal
      interactionKind={PopoverInteractionKind.CLICK}
      position={Position.BOTTOM}
      disabled={disabledPopover}
      popoverClassName={css.popover}
      content={
        <Menu style={{ margin: '1px' }} className={css.colorMenu}>
          {colorNames?.map(colorName => {
            const colorObj = getColorsObj(colorName)
            return (
              <MenuItem
                key={colorName}
                active={colorName === currentColorName}
                text={
                  <Text font={{ size: 'normal' }} style={{ color: `${colorObj.text}` }}>
                    {colorName}
                  </Text>
                }
                onClick={() => onClickColorOption(colorName)}
              />
            )
          })}
        </Menu>
      }>
      <Button
        className={css.selectColor}
        text={
          <Layout.Horizontal width={'97px'} flex={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              font={{ size: 'medium' }}
              icon={'symbol-circle'}
              iconProps={{ size: 20 }}
              padding={{ right: 'xsmall' }}
              style={{
                color: `${currentColorObj.stroke}`
              }}
            />

            <Text
              font={{ size: 'normal' }}
              style={{
                color: `${currentColorObj.text}`,
                gap: '5px',
                alignItems: 'center'
              }}>
              {currentColorName}
            </Text>

            <FlexExpander />
            <Icon
              padding={{ right: 'small', top: '2px' }}
              name="chevron-down"
              font={{ size: 'normal' }}
              size={15}
              background={currentColorObj.text}
            />
          </Layout.Horizontal>
        }
      />
    </Popover>
  )
}

const useLabelModal = ({ refetchlabelsList }: LabelModalProps) => {
  const { repoMetadata, space } = useGetRepositoryMetadata()
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.SAVE)
  const [updateLabel, setUpdateLabel] = useState<UpdateLabelType>()

  const openUpdateLabelModal = (label: UpdateLabelType) => {
    setModalMode(ModalMode.UPDATE)
    setUpdateLabel(label)
    openModal()
  }

  const { mutate: createUpdateLabel } = useMutate({
    verb: 'PUT',
    path: `/api/v1/repos/${repoMetadata?.path as string}/+/labels`
  })

  const { mutate: createUpdateSpaceLabel } = useMutate({
    verb: 'PUT',
    path: `/api/v1/spaces/${space as string}/+/labels`
  })

  // ToDo: replace with getUsingFetch

  const {
    data: repoLabelValues,
    loading: repoValueListLoading,
    refetch: refetchRepoValuesList
  } = useGet<TypesLabelValue[]>({
    path: `/api/v1/repos/${repoMetadata?.path}/+/labels/${encodeURIComponent(
      updateLabel?.key ? updateLabel?.key : ''
    )}/values`,
    lazy: true
  })

  const {
    data: spaceLabelValues,
    loading: spaceValueListLoading,
    refetch: refetchSpaceValuesList
  } = useGet<TypesLabelValue[]>({
    path: `/api/v1/spaces/${space}/+/labels/${encodeURIComponent(updateLabel?.key ? updateLabel?.key : '')}/values`,
    lazy: true
  })

  const [openModal, hideModal] = useModalHook(() => {
    const handleLabelSubmit = (formData: LabelFormData) => {
      const { labelName, color, labelValues, description, allowDynamicValues, id } = formData
      const createLabelPayload: { label: TypesSaveLabelInput; values: TypesSaveLabelValueInput[] } = {
        label: {
          color: color?.toLowerCase() as EnumLabelColor,
          description: description,
          id: id ?? 0,
          key: labelName,
          type: allowDynamicValues ? LabelType.DYNAMIC : LabelType.STATIC
        },
        values: labelValues?.length
          ? labelValues.map(value => {
              return {
                color: value.color?.toLowerCase() as EnumLabelColor,
                id: value.id ?? 0,
                value: value.value
              }
            })
          : []
      }
      if (repoMetadata) {
        try {
          createUpdateLabel(createLabelPayload)
            .then(() => {
              showSuccess(getString('labels.labelCreated'))
              refetchlabelsList()
              hideModal()
            })
            .catch(error => showError(getErrorMessage(error), 1200, getString('labels.labelCreationFailed')))
        } catch (exception) {
          showError(getErrorMessage(exception), 1200, getString('labels.labelCreationFailed'))
        }
      } else {
        try {
          createUpdateSpaceLabel(createLabelPayload)
            .then(() => {
              showSuccess(getString('labels.labelCreated'))
              refetchlabelsList()
              hideModal()
            })
            .catch(error => showError(getErrorMessage(error), 1200, getString('labels.labelUpdateFailed')))
        } catch (exception) {
          showError(getErrorMessage(exception), 1200, getString('labels.labelUpdateFailed'))
        }
      }
    }
    const onClose = () => {
      hideModal()
    }

    const validationSchema = Yup.object({
      labelName: Yup.string()
        .max(50, 'Name must be 50 characters or less')
        .test('no-newlines', 'Name cannot contain new lines', value => !/\r|\n/.test(value as string))
        .required(getString('labels.labelNameReq')),
      labelValues: Yup.array().of(
        Yup.object({
          value: Yup.string()
            .max(50, 'Name must be 50 characters or less')
            .test('no-newlines', 'Name cannot contain new lines', value => !/\r|\n/.test(value as string))
            .required(getString('labels.labelValueReq')),
          color: Yup.string()
        })
      )
    })
    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
      }
    }

    return (
      <Dialog
        isOpen
        onOpening={() => {
          if (modalMode === ModalMode.UPDATE) {
            if (repoMetadata && updateLabel?.scope === 0) refetchRepoValuesList()
            else refetchSpaceValuesList()
          }
        }}
        enforceFocus={false}
        onClose={onClose}
        title={modalMode === ModalMode.SAVE ? getString('labels.createLabel') : getString('labels.updateLabel')}
        className={css.labelModal}>
        <Formik<LabelFormData>
          formName="labelModal"
          initialValues={
            modalMode === ModalMode.SAVE
              ? {
                  color: ColorName.Blue,
                  description: '',
                  id: 0,
                  labelName: '',
                  allowDynamicValues: false,
                  labelValues: []
                }
              : repoMetadata && updateLabel?.scope === 0
              ? {
                  color: updateLabel?.color as ColorName,
                  description: updateLabel?.description,
                  id: updateLabel?.id,
                  labelName: updateLabel?.key ?? '',
                  allowDynamicValues: updateLabel?.type === LabelType.DYNAMIC,
                  labelValues:
                    repoLabelValues?.map(valueObj => {
                      return { id: valueObj.id, value: valueObj.value, color: valueObj.color as ColorName }
                    }) ?? []
                }
              : {
                  color: updateLabel?.color as ColorName,
                  description: updateLabel?.description,
                  id: updateLabel?.id,
                  labelName: updateLabel?.key ?? '',
                  allowDynamicValues: updateLabel?.type === LabelType.DYNAMIC,
                  labelValues:
                    spaceLabelValues?.map(valueObj => {
                      return { id: valueObj.id, value: valueObj.value, color: valueObj.color as ColorName }
                    }) ?? []
                }
          }
          enableReinitialize={true}
          validationSchema={validationSchema}
          validateOnChange
          validateOnBlur
          onSubmit={handleLabelSubmit}>
          {formik => {
            return (
              <FormikForm onKeyDown={handleKeyDown}>
                <Render when={modalMode === ModalMode.UPDATE}>
                  <Container className={css.yellowContainer}>
                    <Text
                      icon="main-issue"
                      iconProps={{ size: 16, color: Color.ORANGE_700, margin: { right: 'small' } }}
                      padding={{ left: 'large', right: 'large', top: 'small', bottom: 'small' }}
                      color={Color.WARNING}>
                      {getString('labels.intentText', {
                        space: updateLabel?.key
                      })}
                    </Text>
                  </Container>
                </Render>
                <Layout.Horizontal spacing={'large'}>
                  <Layout.Vertical style={{ width: '55%' }}>
                    <Layout.Vertical spacing="large" className={css.modalForm}>
                      <Container margin={{ top: 'medium' }}>
                        <Text font={{ variation: FontVariation.BODY2 }}>{getString('labels.labelName')}</Text>
                        <Layout.Horizontal
                          flex={{ alignItems: formik.isValid ? 'center' : 'flex-start', justifyContent: 'flex-start' }}
                          style={{ gap: '4px', margin: '4px' }}>
                          <ColorSelectorDropdown
                            currentColorName={formik.values.color || ColorName.Blue}
                            onClick={(colorName: ColorName) => {
                              formik.setFieldValue('color', colorName)
                            }}
                          />
                          <FormInput.Text
                            key={'labelName'}
                            style={{ flexGrow: '1', margin: 0 }}
                            name="labelName"
                            placeholder={getString('labels.provideLabelName')}
                            tooltipProps={{
                              dataTooltipId: 'labels.newLabel'
                            }}
                            inputGroup={{ autoFocus: true }}
                          />
                        </Layout.Horizontal>
                      </Container>
                      <Container margin={{ top: 'medium' }} className={css.labelDescription}>
                        <Text font={{ variation: FontVariation.BODY2 }}>Description (Optional)</Text>
                        <FormInput.Text name="description" placeholder="Enter a short description for the label" />
                      </Container>
                      <Container margin={{ top: 'medium' }}>
                        <Text font={{ variation: FontVariation.BODY2 }}>Label Value/s (Optional) </Text>
                        <FieldArray
                          name="labelValues"
                          render={({ push, remove }) => {
                            return (
                              <Layout.Vertical>
                                {formik.values.labelValues?.map((_, index) => (
                                  <Layout.Horizontal
                                    key={`labelValue + ${index}`}
                                    flex={{
                                      alignItems: formik.isValid ? 'center' : 'flex-start',
                                      justifyContent: 'flex-start'
                                    }}
                                    style={{ gap: '4px', margin: '4px' }}>
                                    <ColorSelectorDropdown
                                      key={`labelValueColor + ${index}`}
                                      currentColorName={
                                        formik.values.labelValues &&
                                        index !== undefined &&
                                        (formik.values.labelValues[index].color as ColorName)
                                      }
                                      onClick={(colorName: ColorName) => {
                                        formik.setFieldValue(
                                          'labelValues',
                                          formik.values.labelValues?.map((value, i) =>
                                            i === index ? { ...value, color: colorName } : value
                                          )
                                        )
                                      }}
                                    />
                                    <FormInput.Text
                                      key={`labelValueKey + ${index}`}
                                      style={{ flexGrow: '1', margin: 0 }}
                                      name={`${'labelValues'}[${index}].value`}
                                      placeholder="Provide label value"
                                      tooltipProps={{
                                        dataTooltipId: 'labels.newLabel'
                                      }}
                                      inputGroup={{ autoFocus: true }}
                                    />
                                    <Button
                                      key={`removeValue + ${index}`}
                                      style={{ marginRight: 'auto', color: 'var(--grey-300)' }}
                                      variation={ButtonVariation.ICON}
                                      icon={'code-close'}
                                      onClick={() => {
                                        remove(index)
                                      }}
                                    />
                                  </Layout.Horizontal>
                                ))}
                                <Button
                                  style={{ marginRight: 'auto' }}
                                  variation={ButtonVariation.LINK}
                                  disabled={!formik.isValid || formik.values.labelName?.length === 0}
                                  text={getString('labels.addValue')}
                                  icon={CodeIcon.Add}
                                  onClick={() =>
                                    push({
                                      name: '',
                                      color: formik.values.color
                                    })
                                  }
                                />
                              </Layout.Vertical>
                            )
                          }}
                        />
                      </Container>
                      <Container margin={{ top: 'medium' }} className={css.labelDescription}>
                        <FormInput.CheckBox label={getString('labels.allowDynamic')} name="allowDynamicValues" />
                      </Container>
                    </Layout.Vertical>
                    <Container margin={{ top: 'medium' }}>
                      <Layout.Horizontal flex={{ justifyContent: 'flex-start' }}>
                        <Button
                          margin={{ right: 'medium' }}
                          type="submit"
                          text={getString('save')}
                          variation={ButtonVariation.PRIMARY}
                          size={ButtonSize.MEDIUM}
                        />
                        <Button
                          text={getString('cancel')}
                          variation={ButtonVariation.TERTIARY}
                          size={ButtonSize.MEDIUM}
                          onClick={() => {
                            hideModal()
                          }}
                        />
                      </Layout.Horizontal>
                    </Container>
                  </Layout.Vertical>
                  <Layout.Vertical
                    style={{ width: '45%', padding: '25px 35px 25px 35px', borderLeft: '1px solid var(--grey-100)' }}>
                    <Text>Label Preview</Text>
                    <Layout.Vertical spacing={'large'}>
                      {formik.values.labelValues?.length ? (
                        formik.values.labelValues?.map((valueObj, i) => (
                          <Label
                            key={`label + ${i}`}
                            name={formik.values.labelName || getString('labels.labelName')}
                            label_color={formik.values.color}
                            label_value={
                              valueObj.value?.length
                                ? { name: valueObj.value, color: valueObj.color }
                                : { name: getString('labels.labelValue'), color: valueObj.color || formik.values.color }
                            }
                          />
                        ))
                      ) : (
                        <Label
                          name={formik.values.labelName || getString('labels.labelName')}
                          label_color={formik.values.color}
                        />
                      )}
                      {formik.values.allowDynamicValues && (
                        <Label
                          name={formik.values.labelName || getString('labels.labelName')}
                          label_color={formik.values.color}
                          label_value={{ name: getString('labels.canbeAddedByUsers') }}
                        />
                      )}
                    </Layout.Vertical>
                  </Layout.Vertical>
                </Layout.Horizontal>
              </FormikForm>
            )
          }}
        </Formik>
      </Dialog>
    )
  }, [updateLabel, repoLabelValues, spaceLabelValues, repoValueListLoading, spaceValueListLoading])

  return {
    openModal,
    openUpdateLabelModal,
    hideModal
  }
}

export default useLabelModal

import React, { useEffect, useState } from "react"
import { useObserver } from "mobx-react-lite"
import { MappingState, ToolTypes } from "./sharedState"
import { makeStyles } from "@material-ui/core/styles"
import Box from "@material-ui/core/Box"
import Grid from "@material-ui/core/Grid"
import { useTranslation } from "react-i18next"
import RadioGroup from "@material-ui/core/RadioGroup"
import FormControlLabel from "@material-ui/core/FormControlLabel"
import Radio from "@material-ui/core/Radio"
import assets from "../../assets"
import HelpIcon from '@material-ui/icons/Help'
import AddIcon from '@material-ui/icons/Add'
import DeleteIcon from '@material-ui/icons/Delete'
import ZoomInIcon from '@material-ui/icons/ZoomIn'
import ZoomOutIcon from '@material-ui/icons/ZoomOut'
import FormLabel from "@material-ui/core/FormLabel"
import Tooltip from "@material-ui/core/Tooltip"
import FormControl from "@material-ui/core/FormControl"
import InputLabel from "@material-ui/core/InputLabel"
import Select from "@material-ui/core/Select"
import MenuItem from "@material-ui/core/MenuItem"
import IconButton from "@material-ui/core/IconButton"
import Switch from "@material-ui/core/Switch"
import Typography from "@material-ui/core/Typography"
import { addHotkey } from "../../../Common/hooks"
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, DialogContentText, Divider } from "@material-ui/core"
import { state } from "../MappingPage/Track/state"
import { scope } from "../../../MappingScope/scope"
import { randomId, assert } from "../../../Common/utils"

const useStyles = makeStyles(theme => ({
  tools: {
    position: "relative", flexGrow: 0.5, flexShrink: 1.5, maxWidth: "calc(40% - 100px)", overflowX: "hidden", overflowY: "auto",
    "-webkit-overflow-scrolling": "touch",
    "&>*": { maxWidth: 300, position: "absolute", right: 0, top: 30 }
  },
  toolimg: { width: 80 },
  paper: { width: "calc(60vw + 200px)" }
}))

export const zoomin = () => {
  let f = MappingState.timeHeightFactor * 1.414
  if (f > 6380) f = 6400
  MappingState.timeHeightFactor = f
}
export const zoomout = () => {
  let f = MappingState.timeHeightFactor / 1.414
  if (f < 120) f = 100
  MappingState.timeHeightFactor = f
}

const SelectTool = () => {
  const cn = useStyles()
  const { t } = useTranslation()

  useEffect(() => addHotkey("1", () => MappingState.tool = "none"), [])
  useEffect(() => addHotkey("2", () => MappingState.tool = "add"), [])
  useEffect(() => addHotkey("3", () => MappingState.tool = "delete"), [])
  useEffect(() => addHotkey("4", () => MappingState.tool = "set"), [])
  useEffect(() => addHotkey("5", () => MappingState.tool = "interpolate"), [])

  return useObserver(() =>
    <Grid item>
      <Box display="block" my={2} component={FormLabel}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>{t("Tool")}</Grid>
          {/* <Grid item> */}
          {/*   <Tooltip placement="right" */}
          {/*     title={<Typography variant="body2"> */}
          {/*       {t("Double click to switch flick")} <br /> */}
          {/*       {t("Right click to delete note(s)")} <br /> */}
          {/*       {t("Click the slide bar to add mid note")} <br /> */}
          {/*       {t("Hold ctrl and drag to multi-select & copy notes")} */}
          {/*     </Typography>}> */}
          {/*     <HelpIcon fontSize="small" /> */}
          {/*   </Tooltip></Grid> */}
        </Grid>
      </Box>
      <RadioGroup value={MappingState.tool}
        onChange={(e, v) => MappingState.tool = v as ToolTypes}>
        <FormControlLabel value="none" control={<Radio />}
          label={t("None")} title={t("Hotkey: {{ hotkey }}", { hotkey: "1" })} />
        <FormControlLabel value="add" control={<Radio />}
          label={t("Add / Edit")}
          title={t("Hotkey: {{ hotkey }}", { hotkey: "2" })} />
        <FormControlLabel value="delete" control={<Radio />}
          label={t("Delete")} title={t("Hotkey: {{ hotkey }}", { hotkey: "3 / Right click" })} />
        <Divider />
        <FormControlLabel value="set" control={<Radio />}
          label={t("Set Note")} title={t("Hotkey: {{ hotkey }}", { hotkey: "4" })} />
        <Divider />
        <FormControlLabel value="interpolate" control={<Radio />}
          label={t("Interpolate")} title={t("Hotkey: {{ hotkey }}", { hotkey: "5" })} />
      </RadioGroup>
    </Grid>)
}

const SelectDivisor = () => {
  const { t } = useTranslation()
  return useObserver(() =>
    <Grid item>
      <FormControl fullWidth>
        <InputLabel>{t("Grid divisor (of a quarter note)")}</InputLabel>
        <Select fullWidth value={MappingState.division}
          onChange={e => MappingState.division = e.target.value as number} >
          <MenuItem value={1}>1 / 1</MenuItem>
          <MenuItem value={2}>1 / 2</MenuItem>
          <MenuItem value={3}>1 / 3</MenuItem>
          <MenuItem value={4}>1 / 4</MenuItem>
          <MenuItem value={6}>1 / 6</MenuItem>
          <MenuItem value={8}>1 / 8</MenuItem>
          <MenuItem value={12}>1 / 12</MenuItem>
          <MenuItem value={16}>1 / 16</MenuItem>
          <MenuItem value={24}>1 / 24</MenuItem>
          <MenuItem value={32}>1 / 32</MenuItem>
          <MenuItem value={48}>1 / 48</MenuItem>
          <MenuItem value={64}>1 / 64</MenuItem>
          <MenuItem value={96}>1 / 96</MenuItem>
          <MenuItem value={192}>1 / 192</MenuItem>
        </Select>
      </FormControl>
    </Grid>)
}

const ZoomInOut = () => {
  const { t } = useTranslation()

  useEffect(() => addHotkey("+,=", zoomin), [])
  useEffect(() => addHotkey("-,_", zoomout), [])

  useEffect(() => {
    const el = document.getElementById("root")
    const listener = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.stopPropagation()
        e.preventDefault()
        if (e.deltaY < 0) zoomin()
        else zoomout()
      }
    }
    el?.addEventListener("wheel", listener)
    return () => el?.removeEventListener("wheel", listener)
  }, [])

  return useObserver(() =>
    <Grid item container spacing={2}>
      <Grid item>
        <IconButton onClick={zoomin} disabled={MappingState.timeHeightFactor > 6380}
          title={t("Hotkey: {{ hotkey }}", { hotkey: "+ / ctrl + wheel" })}>
          <ZoomInIcon /></IconButton>
      </Grid>
      <Grid item>
        <IconButton onClick={zoomout} disabled={MappingState.timeHeightFactor < 120}
          title={t("Hotkey: {{ hotkey }}", { hotkey: "- / ctrl + wheel" })}>
          <ZoomOutIcon /></IconButton>
      </Grid>
    </Grid>)
}

const OtherTools = () => {
  const { t } = useTranslation()

  useEffect(() => addHotkey("f", () => MappingState.tracking = !MappingState.tracking), [])
  useEffect(() => addHotkey("tab", (e) => {
    MappingState.mirror = !MappingState.mirror; e.stopPropagation(); e.preventDefault()
  }), [])

  return useObserver(() =>
    <Grid item container spacing={2}>
      <Grid item>
        <FormControlLabel label={t("Follow")} title={t("Hotkey: {{ hotkey }}", { hotkey: "f" })}
          control={<Switch checked={MappingState.tracking}
            onChange={(e, v) => MappingState.tracking = v} />} />
      </Grid>
      <Grid item>
        <FormControlLabel label={t("Mirror")} title={t("Hotkey: {{ hotkey }}", { hotkey: "tab" })}
          control={<Switch checked={MappingState.mirror}
            onChange={(e, v) => MappingState.mirror = v} />} />
      </Grid>
    </Grid>)
}

const TimeScaleGroupTool = () => {
  const cn = useStyles()
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState<boolean>(false)
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)
  const [tsgName, setTsgName] = useState<string>("")

  return useObserver(() =>
    <Grid item container spacing={2}>
      <Dialog disableEnforceFocus open={showDialog} onClose={() => setShowDialog(false)} classes={{ paper: cn.paper }}>
        <DialogTitle>Add TimeScale Group</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Name" value={tsgName} onChange={e => setTsgName(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)} color="secondary">
            {t("Cancel")}
          </Button>
          <Button onClick={() => { const id = randomId(); scope.map.addTsGroup(tsgName, id); MappingState.group = id; setShowDialog(false) }} color="primary">
            {t("Create")}
          </Button>
        </DialogActions>
      </Dialog >
      <Dialog disableEnforceFocus open={showEditDialog} onClose={() => setShowEditDialog(false)} classes={{ paper: cn.paper }}>
        <DialogTitle>Edit TimeScale Group</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Name" value={tsgName} onChange={e => setTsgName(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>{(MappingState.group < 0) ? (<></>) :
          (<><Button onClick={() => setShowEditDialog(false)} color="secondary">
            {t("Cancel")}
          </Button>
          <Button onClick={() => { scope.map.editTsGroup(MappingState.group, tsgName); setShowEditDialog(false) }} color="primary">
            {t("Save")}
          </Button></>)}
        </DialogActions>
      </Dialog >
      <Dialog disableEnforceFocus open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} classes={{ paper: cn.paper }}>
        <DialogContent>
          <DialogContentText>{(MappingState.group < 0) ? "You can't delete default group." : (scope.map.notelist.find(({ tsgroup }) => tsgroup === MappingState.group) || scope.map.timescalelist.find(({ tsgroup }) => tsgroup === MappingState.group)) ? "You can only delete empty group." : "Are you sure want to delete this group?"}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="secondary">
            {t("Cancel")}
          </Button>
          {(MappingState.group < 0 || (scope.map.notelist.find(({ tsgroup }) => tsgroup === MappingState.group) || scope.map.timescalelist.find(({ tsgroup }) => tsgroup === MappingState.group))) ? (<></>) : (<Button onClick={() => { scope.map.removeTsGroup(MappingState.group); MappingState.group = -1; setShowDeleteDialog(false) }} color="primary">
            {t("Delete")}
          </Button>)}
        </DialogActions>
      </Dialog >
      <Box display="block" my={2} component={FormLabel}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>{t("Timescale Group")}</Grid>
          <Grid item>
            <Tooltip placement="right"
              title={<Typography variant="body2">
                {t("If you're using None, the center note will have Default group and disk note will have Disk Note group")}
              </Typography>}>
              <HelpIcon fontSize="small" />
            </Tooltip></Grid>
        </Grid>
      </Box>
      <FormControl fullWidth>
        <InputLabel>Select Group</InputLabel>
        <Select fullWidth value={MappingState.group}
          onChange={e => MappingState.group = e.target.value as number} >
          <MenuItem value={-10}>None</MenuItem>
          {
            scope.map.tsgrouplist.map((tsg) => (
              <MenuItem value={tsg.id}>{tsg.name}</MenuItem>
            ))
          }
        </Select>
        <Button onClick={() => {setShowDialog(true); setTsgName(`TsGroup ${scope.map.tsgrouplist.length - 2}`)}}>Add Group</Button>
        {(MappingState.group === -10) ? (<></>) : (<Button onClick={() => copyTSG()}>Copy Group</Button>)}
      </FormControl>{(MappingState.group < 0) ? (<></>) :
      (<><Button variant="text" onClick={() => { setShowEditDialog(true); setTsgName(scope.map.tsgroups.get(MappingState.group)!.name) }}>Edit</Button>
      <Button variant="text" color="secondary" onClick={() => setShowDeleteDialog(true)}>Delete</Button></>)}
    </Grid>)
}

const copyTSG = () => {
  const id = randomId()
  scope.map.copyTSG(assert(scope.map.tsgroups.get(MappingState.group)), id)
  MappingState.group = id
}

const Tools = () => {
  const cn = useStyles()
  return (
    <Box className={cn.tools}>
      <Grid container spacing={4} direction="column">
        <TimeScaleGroupTool />
        <SelectTool />
        <SelectDivisor />
        <ZoomInOut />
        <OtherTools />
      </Grid>
    </Box>)
}

export default Tools

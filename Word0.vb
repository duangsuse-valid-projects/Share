

Sub 输入作文列表()
'
' 输入作文列表 宏
' % 为注释
' "&chr(10)&"% 格式：（第一行）校名 辅导教师
' 

' "&chr(10)&"% = 班级
' "&chr(10)&"% 姓名 《题目》
'
  Dim path, content As String
  path = NewMacros.GetFilePath()
  content = NewMacros.ReadFileAsString(path)
  MsgBox content
  
  Dim lines As Variant
  Dim line As String
  Dim teacher, school, klass As String
  Dim enterList As Boolean
  enterList = False
  
  lines = Strings.split(content, Constants.vbNewLine)
  
  Dim linei As Integer
  Dim doNext As Boolean
  Dim linecs As Variant
  
  Dim num As Integer
  num = 1
  
  doNext = False
  
  For linei = 0 To UBound(lines)
    line = lines(linei)
    line = Strings.Trim(line)
    
    If Strings.StrComp(line, "") = 0 Then GoTo ForNext

    linecs = Strings.split(line, " ")

    If UBound(linecs) >= 1 Then
      If Strings.StrComp(linecs(0), "%") = 0 Then
        doNext = True
      Else
        If enterList Then
          If Strings.StrComp(linecs(0), "=") = 0 Then
            MsgBox linecs(1)
            klass = linecs(1)
          Else
            Dim author, title, fin As String
            Dim split As Variant
            
            split = Strings.split(line, "《")
            fin = Strings.Replace(split(1), "》", "")

            author = split(0)
            title = fin
            MsgBox title + ": " + author
          End If
        Else
          Dim teacherSchool As Variant
          teacherSchool = Strings.split(line, " ")
          school = teacherSchool(0)
          teacher = teacherSchool(1)
          MsgBox teacher + "(" + school + ")"
          enterList = True
        End If
      End If
    End If
ForNext:
  Next
End Sub
Sub EnterText(text As String)
  Selection.TypeText text
End Sub
Sub NextNLine(Optional ByVal i = 1)
  Selection.Move Unit:=wdLine, Count:=i
End Sub
Sub NextCol(Optional ByVal i = 1)
  Selection.Move Unit:=wdCell, Count:=i
End Sub

Import Application.FileDialog

Function GetFilePath() As String
  Dim fd As FileDialog
  Set fd = Application.FileDialog(msoFileDialogFilePicker)

  With fd
  .title = "选择作文列表文件"
  .AllowMultiSelect = False
  .ButtonName = "打开"
  .Filters.Clear
  .Filters.Add "列表文件", "*.txt"
    Select Case .Show
        Case -1
          If fd.SelectedItems.Count = 1 Then
            GetFilePath = fd.SelectedItems.Item(1)
          Else
            MsgBox "请指定并至少选择一个文件"
          End If
    End Select
  End With

End Function

Function ReadFileAsString(ByVal path As String) As String
  Dim l, result As String
  Open path For Input As #1
  While Not EOF(1)
    Line Input #1, l
    result = result + l + Constants.vbNewLine
  Wend
  Close #1
  ReadFileAsString = result
End Function

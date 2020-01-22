#pragma once

#include <QObject>
#include <QMainWindow>
#include <QVBoxLayout>
#include <QPushButton>
#include <QLabel>
#include <QSlider>

class SumApp: public QMainWindow
{ Q_OBJECT
public:
    SumApp(); ~SumApp();
private:
    void bindLayout();
    QSlider* x0; QSlider* x1;
    QLabel* result;
    QPushButton* btnSum;
private slots:
    void onSum();
};
